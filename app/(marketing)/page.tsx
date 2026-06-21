import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-blue-400 border border-blue-800 rounded-full px-4 py-1">
            Plataforma Educacional B2B
          </span>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Venda mais com <span className="text-blue-400">inteligência</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Scanner de vendas, simulações gamificadas, trilhas por segmento, IA para treinar objeções e
            gerar scripts — tudo em um só lugar para equipes B2B de alta performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/sign-up"
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
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 bg-gray-900 px-4 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "📊", title: "Scanner Empresarial", desc: "Diagnóstico em 35 perguntas com análise de IA para mapear maturidade de vendas." },
            { icon: "🎮", title: "Simulação Gamificada", desc: "Gerencie uma empresa virtual e tome decisões de vendas com feedback em tempo real." },
            { icon: "🤖", title: "IA para Objeções", desc: "Pratique contornar as principais objeções com um cliente simulado por IA." },
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
