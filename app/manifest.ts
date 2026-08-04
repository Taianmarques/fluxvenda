import type { MetadataRoute } from "next";

// PWA da plataforma — atendentes adicionam à tela inicial e usam o CRM como app.
// Ícones servidos por /api/branding/icon/[size] (dinâmico) em vez de arquivos estáticos:
// usa o ícone customizado enviado pelo Super Admin em /admin/branding quando existir,
// senão cai pros PNGs estáticos gerados de public/iconefluxvenda.png. Esse manifest.ts
// continua estático (sem API de request-time) — só a rota dos ícones é dinâmica. O iOS
// usa o app/apple-icon.png (linkado sozinho pelo Next), não afetado por essa mudança.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SF Madeiras",
    short_name: "SF Madeiras",
    description: "CRM e agente de IA para WhatsApp e Instagram",
    id: "/crm",
    start_url: "/crm",
    scope: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    icons: [
      { src: "/api/branding/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/branding/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/branding/icon/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
