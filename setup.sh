#!/usr/bin/env bash
# Setup/deploy da plataforma na VPS. Roda em qualquer pasta (ex: $HOME).
# Primeira vez: clona o repo, gera um .env.local de exemplo e para para você editar.
# Próximas vezes: já reconhece o repo clonado e só atualiza/builda/reinicia via PM2.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/Taianmarques/fluxvenda/master/setup.sh -o setup.sh
#   bash setup.sh
set -e

REPO_URL="https://github.com/Taianmarques/fluxvenda.git"
APP_DIR="$HOME/fluxvenda"
APP_NAME="fluxvenda"
PORT=3002

if [ ! -d "$APP_DIR" ]; then
  echo "==> Clonando repositório em $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f .env.local ]; then
  echo "==> Criando .env.local de exemplo (você precisa editar com os valores reais)..."
  cat > .env.local <<'ENVEOF'
DATABASE_URL=""
DIRECT_URL=""

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/onboarding"

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

OPENAI_API_KEY=""

UAZAPI_URL=""
UAZAPI_TOKEN=""
UAZAPI_ADMIN_TOKEN=""

CRON_SECRET=""

NEXT_PUBLIC_APP_URL="http://212.85.1.162:3002"
ENVEOF
  echo
  echo "==> Edite o arquivo com os valores reais e rode este script de novo:"
  echo "    nano $APP_DIR/.env.local"
  echo "    bash $APP_DIR/setup.sh"
  exit 0
fi

if grep -qE '="\s*"' .env.local; then
  echo "ERRO: .env.local ainda tem campos vazios. Edite $APP_DIR/.env.local e preencha todos os valores antes de continuar."
  exit 1
fi

echo "==> Buscando última versão do código..."
git pull origin master

echo "==> Instalando dependências..."
npm ci

echo "==> Aplicando migrations do banco..."
npx prisma generate
npx prisma migrate deploy

echo "==> Build de produção..."
npm run build

if ! command -v pm2 > /dev/null 2>&1; then
  echo "==> PM2 não encontrado, instalando..."
  npm install -g pm2
fi

echo "==> Iniciando/reiniciando com PM2..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
  pm2 startup > /dev/null 2>&1 || true
fi
pm2 save

echo
echo "==> Deploy concluído. App rodando em http://212.85.1.162:$PORT"
echo "    Logs: pm2 logs $APP_NAME"
