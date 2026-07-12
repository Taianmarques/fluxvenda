import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só vale em dev: permite testar pelo túnel ngrok (webhook + páginas públicas no celular)
  // sem o dev server bloquear os assets como cross-origin. Sem efeito em produção.
  allowedDevOrigins: ["rebate-glamour-handcuff.ngrok-free.dev"],
};

export default nextConfig;
