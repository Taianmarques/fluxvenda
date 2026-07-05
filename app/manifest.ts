import type { MetadataRoute } from "next";

// PWA da plataforma — atendentes adicionam à tela inicial e usam o CRM como app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FluxVenda",
    short_name: "FluxVenda",
    description: "CRM e agente de IA para WhatsApp e Instagram",
    start_url: "/crm",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
