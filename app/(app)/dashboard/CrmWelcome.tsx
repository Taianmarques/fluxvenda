import Link from "next/link";
import { Bot, MessageCircle, LayoutGrid, ArrowRight, Wrench } from "lucide-react";

// Home de quem contratou só o CRM (sem a Plataforma de treinamento) — orienta a criar
// o primeiro agente de IA em vez de mostrar XP/missões/trilhas, que não fazem sentido aqui.
export function CrmWelcome({ firstName, agentCount }: { firstName: string; agentCount: number }) {
  if (agentCount === 0) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-900/40 border border-blue-700 flex items-center justify-center text-4xl mx-auto">
            <Bot size={36} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Olá, {firstName || "tudo bem"}!</h1>
            <p className="text-gray-400 mt-2">
              Vamos criar seu primeiro agente de IA para o WhatsApp — ele atende, agenda, vende e
              cobra pelos seus clientes automaticamente.
            </p>
          </div>
          <Link
            href="/ferramentas"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-colors"
          >
            <Wrench size={18} /> Criar meu primeiro agente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Olá, {firstName || "tudo bem"}!</h1>
        <p className="text-gray-400 mt-1">
          {agentCount === 1 ? "Seu agente de IA está pronto." : `Seus ${agentCount} agentes de IA estão prontos.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/crm"
          className="flex flex-col gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-green-700 rounded-2xl transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-green-900/40 text-green-400 flex items-center justify-center"><MessageCircle size={20} /></span>
          <div>
            <p className="font-semibold flex items-center gap-1">Conversas <ArrowRight size={14} className="text-gray-600" /></p>
            <p className="text-sm text-gray-500 mt-0.5">Veja o atendimento em tempo real no CRM.</p>
          </div>
        </Link>

        <Link
          href="/crm/hub"
          className="flex flex-col gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-blue-700 rounded-2xl transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-blue-900/40 text-blue-400 flex items-center justify-center"><LayoutGrid size={20} /></span>
          <div>
            <p className="font-semibold flex items-center gap-1">Hub de agentes <ArrowRight size={14} className="text-gray-600" /></p>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe métricas e ligue/desligue cada agente.</p>
          </div>
        </Link>

        <Link
          href="/ferramentas"
          className="flex flex-col gap-3 p-6 bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-2xl transition-colors"
        >
          <span className="w-11 h-11 rounded-xl bg-purple-900/40 text-purple-400 flex items-center justify-center"><Wrench size={20} /></span>
          <div>
            <p className="font-semibold flex items-center gap-1">Ferramentas <ArrowRight size={14} className="text-gray-600" /></p>
            <p className="text-sm text-gray-500 mt-0.5">Crie um novo agente ou ajuste a configuração.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
