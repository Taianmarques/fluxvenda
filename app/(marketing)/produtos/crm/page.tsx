import Link from "next/link";

export default function CrmLandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-blue-400 border border-blue-800 rounded-full px-4 py-1">
            CRM com Agente de IA
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Atenda no <span className="text-blue-400">WhatsApp</span> com inteligência artificial
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Um agente de IA que atende, agenda, vende, cobra e prospecta pelo WhatsApp — com um CRM
            completo por trás para sua equipe acompanhar tudo em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/sign-up?product=crm"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
            >
              Começar grátis
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-3 border border-gray-700 hover:border-gray-500 rounded-xl font-semibold transition-colors text-gray-300"
            >
              Entrar
            </Link>
          </div>
          <Link href="/produtos/plataforma" className="block text-sm text-gray-500 hover:text-gray-300 pt-2">
            Procurando a plataforma de treinamento de vendas? →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 bg-gray-900 px-4 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "🤖", title: "Atendimento com IA", desc: "Responde clientes no WhatsApp 24h, entendendo contexto e histórico da conversa." },
            { icon: "📅", title: "Agendamento", desc: "Consulta horários disponíveis e confirma agendamentos direto na conversa." },
            { icon: "🛒", title: "Comércio", desc: "Catálogo, montagem de pedido, entrega e cobrança via Pix ou cartão." },
            { icon: "💰", title: "Cobrança", desc: "Envio e renegociação de boletos automaticamente, com acompanhamento de status." },
            { icon: "📣", title: "Campanhas e Prospecção", desc: "Disparo em massa com ritmo seguro e qualificação automática de leads." },
            { icon: "📊", title: "CRM em tempo real", desc: "Kanban de conversas, funil de vendas e atendimento humano quando precisar." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-800 bg-gray-950 space-y-3">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
