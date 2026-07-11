import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-blue-400 border border-blue-800 rounded-full px-4 py-1">
            FluxVenda
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Venda mais com <span className="text-blue-400">inteligência</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Duas soluções, um só objetivo: equipes de vendas B2B de alta performance. Escolha o que sua
            empresa precisa agora — ou contrate os dois.
          </p>
        </div>
      </section>

      {/* Escolha de produto */}
      <section className="border-t border-gray-800 bg-gray-900 px-4 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/produtos/crm"
            className="group p-8 rounded-2xl border border-gray-800 hover:border-blue-600 bg-gray-950 space-y-4 transition-colors"
          >
            <span className="text-4xl">💬</span>
            <h2 className="text-2xl font-bold group-hover:text-blue-400 transition-colors">CRM com Agente de IA</h2>
            <p className="text-gray-400 leading-relaxed">
              Agente de WhatsApp com inteligência artificial: atendimento automático, agendamento,
              comércio, cobrança e campanhas — tudo com um CRM completo por trás.
            </p>
            <span className="inline-block text-sm font-semibold text-blue-400">Conhecer o CRM →</span>
          </Link>

          <Link
            href="/produtos/plataforma"
            className="group p-8 rounded-2xl border border-gray-800 hover:border-purple-600 bg-gray-950 space-y-4 transition-colors"
          >
            <span className="text-4xl">🎯</span>
            <h2 className="text-2xl font-bold group-hover:text-purple-400 transition-colors">Plataforma de Treinamento</h2>
            <p className="text-gray-400 leading-relaxed">
              Scanner de maturidade comercial, trilhas por segmento, simulação gamificada e IA para
              treinar objeções e gerar scripts — desenvolva sua equipe de vendas.
            </p>
            <span className="inline-block text-sm font-semibold text-purple-400">Conhecer a Plataforma →</span>
          </Link>
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          Já tem uma conta? <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
