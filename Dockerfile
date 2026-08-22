FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Variáveis NEXT_PUBLIC_* são inlined no bundle do cliente durante o build —
# precisam estar disponíveis aqui, não só em runtime. Se o painel de deploy
# (ex: EasyPanel) só injeta env vars em runtime, passe estas como build args.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG DATABASE_URL
ARG DIRECT_URL
# SESSION_SECRET não é NEXT_PUBLIC_*, mas lib/auth/session.ts é importado por
# praticamente toda página — se alguma delas for pré-renderizada durante o
# build, precisa estar disponível aqui também (mesmo motivo do DATABASE_URL acima).
ARG SESSION_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV SESSION_SECRET=$SESSION_SECRET
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3002
ENV TZ=America/Sao_Paulo
EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -- -p 3002"]
