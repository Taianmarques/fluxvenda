import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
import { NovoAgenteCard } from "./NovoAgenteCard";

export default async function FerramentasPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) redirect("/dashboard");

  const team = await prisma.team.findUnique({
    where: { managerId: user.id },
    include: { agentConfigs: { orderBy: { createdAt: "asc" } } },
  });
  const agentConfigs = team?.agentConfigs ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <p className="text-gray-400 text-sm">Painel de ferramentas</p>
          <h1 className="text-3xl font-bold mt-1">Agentes de Atendimento — WhatsApp</h1>
          <p className="text-gray-400 mt-1">Cada agente tem seu próprio número de WhatsApp e seu próprio CRM. Crie um agente para cada setor ou frente de atendimento da sua empresa.</p>
        </div>

        {agentConfigs.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-300">Seus agentes</p>
            <div className="grid md:grid-cols-2 gap-4">
              {agentConfigs.map(agent => {
                const status = agent.active ? "Ativo" : agent.uazapiToken ? "Pausado" : "Não conectado";
                const statusColor = agent.active
                  ? "bg-green-900/40 text-green-300 border-green-800/50"
                  : "bg-gray-800 text-gray-400 border-gray-700";
                return (
                  <Link
                    key={agent.id}
                    href={`/ferramentas/whatsapp/${agent.id}`}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-700 transition-colors flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                        <Bot size={22} />
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>{status}</span>
                    </div>
                    <p className="font-semibold text-lg">{agent.nome}</p>
                    {agent.segmento && (
                      <p className="text-sm text-gray-400">{agent.segmento}{agent.subsegmento && ` · ${agent.subsegmento}`}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <NovoAgenteCard />
      </div>
    </div>
  );
}
