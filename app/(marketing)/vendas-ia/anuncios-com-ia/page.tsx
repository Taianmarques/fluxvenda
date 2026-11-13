import type { Metadata } from "next";
import { Em } from "../_ui";
import { LandingTrafego } from "../_trafego/LandingTrafego";

// Gestor de Tráfego com IA — ângulo "clientes no WhatsApp sem agência" (corpo em _trafego/LandingTrafego)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestor de Tráfego com IA — clientes no WhatsApp sem pagar agência",
  description: "Coloque a IA pra cuidar dos seus anúncios e receba clientes no WhatsApp, em 20 minutos por semana e sem pagar agência.",
  openGraph: {
    title: "Coloque a IA pra cuidar dos seus anúncios e receba clientes no WhatsApp",
    description: "Em 20 minutos por semana e sem pagar agência. Aulas em vídeo e comandos prontos para o Claude ou o ChatGPT conectados ao Meta Ads.",
  },
};

export default function AnunciosComIaLanding() {
  return (
    <LandingTrafego
      titulo={<>Coloque a IA pra cuidar dos seus anúncios e receba clientes no WhatsApp, <Em>em 20 minutos por semana e sem pagar agência.</Em></>}
    />
  );
}
