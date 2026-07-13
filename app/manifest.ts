import type { MetadataRoute } from "next";

// PWA da plataforma — atendentes adicionam à tela inicial e usam o CRM como app.
// Ícones PNG gerados a partir de public/iconefluxvenda.png (logo oficial): 192/512 +
// maskable pro Android; o iOS usa o app/apple-icon.png (linkado sozinho pelo Next).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FluxVenda",
    short_name: "FluxVenda",
    description: "CRM e agente de IA para WhatsApp e Instagram",
    id: "/crm",
    start_url: "/crm",
    scope: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
