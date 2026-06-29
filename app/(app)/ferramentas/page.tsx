import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, Calendar, Sparkles } from "lucide-react";

export default async function FerramentasPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) redirect("/dashboard");

  const team = await prisma.team.findUnique({
    where: { managerId: user.id },
    include: { agentConfigs: { orderBy: { createdAt: "asc" } } },
  });
  // TODO(fase 5): listar todos os agentes da equipe + "+ Novo agente"; por ora mostra o mais antigo
  const agentConfig = team?.agentConfigs?.[0];

  const whatsappConfigured = Boolean(agentConfig?.active);
  const schedulingEnabled = Boolean(agentConfig?.schedulingEnabled);

  const TOOLS = [
    {
      href: "/ferramentas/whatsapp",
      icon: Bot,
      title: "Agente de Atendimento — WhatsApp",
      description: "Conecte o WhatsApp da sua empresa a um agente de IA treinado para qualificar leads e responder objeções automaticamente.",
      status: whatsappConfigured ? "Ativo" : "Não configurado",
      statusColor: whatsappConfigured ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-gray-800 text-gray-400 border-gray-700",
    },
    {
      href: "/crm/agenda",
      icon: Calendar,
      title: "Agendamento via WhatsApp",
      description: "O agente de IA consulta sua disponibilidade real e marca compromissos direto na conversa, sem precisar de confirmação manual.",
      status: !whatsappConfigured ? "Requer WhatsApp ativo" : schedulingEnabled ? "Ativo" : "Não configurado",
      statusColor: whatsappConfigured && schedulingEnabled ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-gray-800 text-gray-400 border-gray-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <p className="text-gray-400 text-sm">Painel de ferramentas</p>
          <h1 className="text-3xl font-bold mt-1">Ferramentas Plug & Play</h1>
          <p className="text-gray-400 mt-1">Conecte ferramentas de IA prontas para usar na sua operação — sem precisar de desenvolvedor.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-700 transition-colors flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <tool.icon size={22} />
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tool.statusColor}`}>{tool.status}</span>
              </div>
              <p className="font-semibold text-lg">{tool.title}</p>
              <p className="text-sm text-gray-400">{tool.description}</p>
            </Link>
          ))}

          <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 text-gray-600">
            <Sparkles size={26} />
            <p className="text-sm">Mais ferramentas em breve</p>
          </div>
        </div>
      </div>
    </div>
  );
}
