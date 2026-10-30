import type { Metadata } from "next";
import { Em } from "../_ui";
import { LandingFerramentas } from "../_ferramentas/LandingFerramentas";

// Landing "100 ferramentas" — ângulo "você já usa a IA, mas aproveita tudo?" (corpo em
// _ferramentas/LandingFerramentas; mesma oferta de R$ 67)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendas IA — aproveite o ChatGPT e o Claude nas suas vendas",
  description: "Você já usa o ChatGPT ou o Claude. Tenha 100 ferramentas comerciais prontas, personalizadas para o seu negócio, para tirar o máximo da IA nas suas vendas. Pagamento único.",
  openGraph: {
    title: "Você já usa o ChatGPT ou o Claude. Mas está aproveitando tudo o que ele pode fazer pelas suas vendas?",
    description: "100 ferramentas comerciais prontas para criar anúncios, melhorar negociações, recuperar orçamentos e planejar suas vendas.",
  },
};

export default function IaParaVenderLanding() {
  return (
    <LandingFerramentas
      topo={{
        eyebrow: "Inteligência artificial para quem precisa vender",
        titulo: <>Você já usa o ChatGPT ou Claude. <Em>Mas está aproveitando tudo o que ele pode fazer pelas suas vendas?</Em></>,
        tituloLongo: true,
        subtitulo: total => `Pare de perder tempo tentando descobrir o que pedir à IA. Tenha ${total} ferramentas comerciais prontas para criar anúncios, melhorar negociações, recuperar orçamentos e planejar suas vendas personalizadas para o seu negócio.`,
        tituloProblema: <>Ter a IA aberta no navegador não é o mesmo que <Em>vender com ela.</Em></>,
      }}
    />
  );
}
