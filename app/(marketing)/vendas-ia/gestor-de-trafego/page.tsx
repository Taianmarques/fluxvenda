import type { Metadata } from "next";
import { Em } from "../_ui";
import { LandingTrafego } from "../_trafego/LandingTrafego";

// Gestor de Tráfego com IA — ângulo "gerencie conversando" (corpo em _trafego/LandingTrafego)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestor de Tráfego com IA — Vendas IA",
  description: "Conecte sua conta de anúncios do Meta ao Claude ou ao ChatGPT e gerencie suas campanhas conversando. Aulas em vídeo + comandos prontos.",
  openGraph: {
    title: "Gestor de Tráfego com IA: gerencie seus anúncios do Meta conversando com a IA",
    description: "Aulas em vídeo e comandos prontos para criar, analisar e otimizar campanhas pelo Claude ou pelo ChatGPT.",
  },
};

export default function GestorDeTrafegoLanding() {
  return <LandingTrafego titulo={<>Gerencie seus anúncios do Facebook e do Instagram <Em>conversando com a IA.</Em></>} />;
}
