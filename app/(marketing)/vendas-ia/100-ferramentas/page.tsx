import type { Metadata } from "next";
import { Em } from "../_ui";
import { LandingFerramentas } from "../_ferramentas/LandingFerramentas";

// Landing "100 ferramentas" — ângulo "o que pedir ao ChatGPT" (corpo em _ferramentas/LandingFerramentas)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendas IA — 100 ferramentas comerciais para usar no ChatGPT e no Claude",
  description: "Pare de perder tempo tentando descobrir o que pedir ao ChatGPT. 100 ferramentas comerciais prontas, personalizadas para o seu negócio. Pagamento único.",
  openGraph: {
    title: "Pare de perder tempo tentando descobrir o que pedir ao ChatGPT",
    description: "100 ferramentas comerciais prontas para criar anúncios, atrair clientes, atender, negociar e recuperar oportunidades de venda.",
  },
};

export default function CemFerramentasLanding() {
  return (
    <LandingFerramentas
      topo={{
        eyebrow: "Inteligência artificial para quem precisa vender",
        titulo: <>Pare de perder tempo tentando descobrir <Em>o que pedir ao ChatGPT.</Em></>,
        subtitulo: total => `Tenha ${total} ferramentas comerciais prontas para criar anúncios, atrair clientes, melhorar o atendimento, negociar e recuperar oportunidades de vendas — personalizadas para o seu negócio.`,
        tituloProblema: <>Você já tem acesso à inteligência artificial. <Em>Mas sabe exatamente como usá-la para vender?</Em></>,
      }}
    />
  );
}
