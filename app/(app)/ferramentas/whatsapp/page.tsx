import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WhatsappAgentClient } from "./WhatsappAgentClient";
import { QrConnect } from "./QrConnect";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default async function WhatsappAgentPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) redirect("/dashboard");

  const team = await prisma.team.findUnique({ where: { managerId: user.id } });
  if (!team) redirect("/dashboard");

  const config = await prisma.agentConfig.findUnique({ where: { teamId: team.id } });

  if (!config?.uazapiToken) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <Link href="/ferramentas" className="text-xs text-gray-500 hover:text-gray-300">← Ferramentas</Link>
            <h1 className="text-3xl font-bold mt-2">🤖 Agente de Atendimento — WhatsApp</h1>
            <p className="text-gray-400 mt-1">Configure seu agente de IA para atender leads e clientes automaticamente pelo WhatsApp da sua empresa.</p>
          </div>
          <WhatsappAgentClient
            initialConfig={config ? {
              nome: config.nome, tom: config.tom, servicos: config.servicos, objecoes: config.objecoes,
              horario: config.horario, uazapiInstance: config.uazapiInstance, hasToken: Boolean(config.uazapiToken),
            } : null}
          />
        </div>
      </div>
    );
  }

  if (!config.active) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <Link href="/ferramentas" className="text-xs text-gray-500 hover:text-gray-300">← Ferramentas</Link>
            <h1 className="text-2xl font-bold mt-2">📲 Conecte o WhatsApp</h1>
            <p className="text-gray-400 mt-1">Escaneie o QR code com o WhatsApp do número <span className="text-gray-300">{config.uazapiInstance}</span> para ativar o agente.</p>
          </div>
          <QrConnect />
        </div>
      </div>
    );
  }

  const [totalConversas, conversasHoje, conversasSemana] = await Promise.all([
    prisma.conversation.count({ where: { agentConfigId: config.id } }),
    prisma.conversation.count({ where: { agentConfigId: config.id, createdAt: { gte: daysAgo(1) } } }),
    prisma.conversation.count({ where: { agentConfigId: config.id, createdAt: { gte: daysAgo(7) } } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Link href="/ferramentas" className="text-xs text-gray-500 hover:text-gray-300">← Ferramentas</Link>
            <h1 className="text-3xl font-bold mt-2">🤖 {config.nome}</h1>
            <p className="text-gray-400 mt-1">Agente de atendimento conectado ao WhatsApp da sua empresa.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">● Ativo</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Conversas (hoje)", value: conversasHoje },
            { label: "Conversas (7 dias)", value: conversasSemana },
            { label: "Total de conversas", value: totalConversas },
          ].map(m => (
            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-3xl font-bold text-blue-400">{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <Link
          href="/whatsapp"
          className="flex items-center justify-between gap-4 bg-gradient-to-r from-green-950/40 to-emerald-950/40 border border-green-800/50 rounded-2xl p-5 hover:border-green-600 transition-colors"
        >
          <div>
            <p className="font-semibold text-green-300">💬 Abrir caixa de entrada</p>
            <p className="text-sm text-gray-400 mt-1">Veja as conversas em tempo real e assuma o atendimento manualmente quando precisar.</p>
          </div>
          <span className="text-green-400 text-xl">→</span>
        </Link>

        <div>
          <h2 className="text-xl font-bold mb-4">Configurações do agente</h2>
          <WhatsappAgentClient
            initialConfig={{
              nome: config.nome, tom: config.tom, servicos: config.servicos, objecoes: config.objecoes,
              horario: config.horario, uazapiInstance: config.uazapiInstance, hasToken: Boolean(config.uazapiToken),
            }}
          />
        </div>
      </div>
    </div>
  );
}
