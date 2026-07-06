#!/usr/bin/env bash
# Migra o banco do Supabase (EUA) para PostgreSQL local na VPS.
# Ganho: consultas caem de ~180ms para <1ms — páginas ~10x mais rápidas.
#
# USO (como root na VPS):
#   cd ~/fluxvenda && git pull && bash scripts/migrar-banco-vps.sh
#
# O que ele faz:
#   1. Instala PostgreSQL 17 (se ainda não tiver)
#   2. Cria banco e usuário locais com senha aleatória
#   3. Para o app (janela de manutenção — mensagens que chegarem nesse intervalo são perdidas)
#   4. Dump do Supabase (schema public) e restore local
#   5. Troca a DATABASE_URL no .env.local (backup do arquivo antigo é mantido)
#   6. Religa o app e configura backup diário às 3h em /root/backups (7 dias de retenção)
#
# ROLLBACK: restaure o .env.local.bak-* e rode `pm2 restart fluxvenda` — o Supabase
# continua intacto com os dados até o momento da migração.

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/fluxvenda}"
ENV_FILE="$APP_DIR/.env.local"
DB_NAME="fluxvenda"
DB_USER="fluxvenda"
STAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="/root/supabase-dump-$STAMP.dump"

echo "==> 1/8 Lendo DATABASE_URL atual (Supabase)..."
OLD_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$OLD_URL" ]; then echo "ERRO: DATABASE_URL não encontrada em $ENV_FILE"; exit 1; fi
case "$OLD_URL" in
  *localhost*|*127.0.0.1*) echo "ERRO: DATABASE_URL já aponta para banco local — nada a migrar."; exit 1;;
esac

echo "==> 2/8 Instalando PostgreSQL 17 (se necessário)..."
if ! command -v pg_dump >/dev/null 2>&1 || ! pg_dump --version | grep -qE ' 1[5-9]| 2[0-9]'; then
  apt-get update -qq
  apt-get install -y -qq postgresql-common >/dev/null
  YES=yes /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null 2>&1 || true
  apt-get update -qq
  apt-get install -y -qq postgresql-17 >/dev/null
fi
systemctl enable --now postgresql >/dev/null 2>&1 || true
sleep 2

echo "==> 3/8 Criando banco e usuário locais..."
DB_PASS=$(openssl rand -hex 24)
sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$body\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  ELSE
    ALTER ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  END IF;
END \$body\$;
SQL
sudo -u postgres createdb -O "$DB_USER" "$DB_NAME" 2>/dev/null || echo "    (banco $DB_NAME já existia — objetos serão sobrescritos no restore)"

NEW_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

echo "==> 4/8 Parando o app (janela de manutenção)..."
pm2 stop fluxvenda >/dev/null || true

echo "==> 5/8 Dump do Supabase (pode levar alguns minutos)..."
# Senhas com caracteres especiais (@, #, etc.) quebram o parse de URL do pg_dump.
# Extrai as partes com o parser do Node e conecta via variáveis PG* (sem URL).
PARSED=$(OLD_URL="$OLD_URL" node -e "
const u = new URL(process.env.OLD_URL);
console.log(u.hostname);
console.log(u.port || '5432');
console.log(decodeURIComponent(u.username));
console.log(decodeURIComponent(u.password));
console.log((u.pathname.split('/')[1] || 'postgres').split('?')[0]);
")
PGHOST=$(echo "$PARSED" | sed -n 1p)
PGPORT=$(echo "$PARSED" | sed -n 2p)
PGUSER=$(echo "$PARSED" | sed -n 3p)
PGPASSWORD=$(echo "$PARSED" | sed -n 4p)
PGDATABASE=$(echo "$PARSED" | sed -n 5p)
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
echo "    Conectando em $PGHOST:$PGPORT/$PGDATABASE como $PGUSER..."
pg_dump --schema=public --no-owner --no-privileges -Fc -f "$DUMP_FILE"
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
echo "    Dump salvo em $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo "==> 6/8 Restore no banco local..."
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_URL" "$DUMP_FILE"

echo "    Verificando dados..."
AGENTES=$(psql "$NEW_URL" -tAc 'SELECT count(*) FROM "AgentConfig";')
CONVERSAS=$(psql "$NEW_URL" -tAc 'SELECT count(*) FROM "Conversation";')
MENSAGENS=$(psql "$NEW_URL" -tAc 'SELECT count(*) FROM "Message";')
echo "    AgentConfig: $AGENTES | Conversation: $CONVERSAS | Message: $MENSAGENS"
if [ "$AGENTES" = "0" ]; then
  echo "ERRO: restore veio vazio — o app NÃO foi religado no banco novo."
  echo "Rode: pm2 restart fluxvenda  (continua no Supabase, nada mudou)"
  exit 1
fi

echo "==> 7/8 Atualizando .env.local (backup: $ENV_FILE.bak-$STAMP)..."
cp "$ENV_FILE" "$ENV_FILE.bak-$STAMP"
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$NEW_URL\"|" "$ENV_FILE"
if grep -q '^DIRECT_URL=' "$ENV_FILE"; then
  sed -i "s|^DIRECT_URL=.*|DIRECT_URL=\"$NEW_URL\"|" "$ENV_FILE"
fi

echo "==> 8/8 Religando o app e configurando backup diário..."
cd "$APP_DIR"
pm2 restart fluxvenda --update-env >/dev/null

mkdir -p /root/backups
cat > /etc/cron.d/fluxvenda-backup <<CRON
0 3 * * * root pg_dump "$NEW_URL" -Fc -f /root/backups/fluxvenda-\$(date +\%Y\%m\%d).dump && find /root/backups -name 'fluxvenda-*.dump' -mtime +7 -delete
CRON
chmod 644 /etc/cron.d/fluxvenda-backup

echo ""
echo "✅ Migração concluída!"
echo "   - Banco local:  $NEW_URL"
echo "   - Env antigo:   $ENV_FILE.bak-$STAMP (rollback: restaurar e pm2 restart)"
echo "   - Backup diário: 3h da manhã em /root/backups (7 dias de retenção)"
echo "   - O Supabase segue intacto como cópia de segurança da data de hoje."
echo ""
echo "Teste agora: abra o app, navegue no CRM e confira as conversas."
