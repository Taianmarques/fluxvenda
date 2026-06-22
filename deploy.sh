#!/usr/bin/env bash
# Deploy/atualizacao da plataforma na VPS. Roda na pasta do projeto (~/fluxvenda).
# Uso: ./deploy.sh
set -e

APP_NAME="fluxvenda"
PORT=3002

cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "ERRO: .env.local não encontrado. Crie esse arquivo com as variáveis de ambiente antes de rodar o deploy."
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
fi
pm2 save

echo "==> Deploy concluído. Logs: pm2 logs $APP_NAME"
