#!/usr/bin/env bash
# Deploy padrão na VPS — roda a sequência completa e sempre funciona,
# com ou sem mudança de schema no banco.
#
# USO: cd ~/fluxvenda && git pull && bash scripts/atualizar.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/fluxvenda}"
cd "$APP_DIR"

echo "==> 1/4 Aplicando migrations pendentes no banco (se houver)..."
npx prisma migrate deploy

echo "==> 2/4 Gerando o client do Prisma..."
npx prisma generate

echo "==> 3/4 Build de produção..."
npm run build

echo "==> 4/4 Reiniciando o app..."
pm2 restart fluxvenda --update-env

echo ""
echo "✅ Deploy concluído — https://app.fluxvenda.com.br"
