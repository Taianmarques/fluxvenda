import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só vale em dev: permite testar pelo túnel ngrok (webhook + páginas públicas no celular)
  // sem o dev server bloquear os assets como cross-origin. Sem efeito em produção.
  allowedDevOrigins: ["rebate-glamour-handcuff.ngrok-free.dev"],
  experimental: {
    // proxy.ts (auth) passa por TODA requisição e buffera o corpo com limite de 10MB por
    // padrão — acima disso o Next só loga um aviso e trunca silenciosamente, sem dar erro
    // (nem pro nginx, que já libera até 150MB). Sem isso, o limite de anexo de 100MB do chat
    // (ver MAX_ATTACHMENT_MB) não tinha efeito real pra arquivo grande.
    proxyClientMaxBodySize: "150mb",
  },
};

export default nextConfig;
