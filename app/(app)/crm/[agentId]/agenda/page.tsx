import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { AgendaClient } from "../../agenda/AgendaClient";

export default async function AgendaPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Calendar size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento antes de ativar agendamentos.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  // Garante o token do link da agenda geral (gerado na primeira visita)
  let agendaAccessToken = config.agendaAccessToken;
  if (!agendaAccessToken) {
    agendaAccessToken = randomUUID();
    await prisma.agentConfig.update({ where: { id: config.id }, data: { agendaAccessToken } });
  }

  return (
    <AgendaClient
      agentId={config.id}
      initialSchedulingEnabled={config.schedulingEnabled}
      initialSlotDurationMinutes={config.slotDurationMinutes}
      initialAvailability={config.availability as any}
      initialAppointmentReminderHours={config.appointmentReminderHours}
      initialRequisitosAgendamento={config.requisitosAgendamento}
      initialRestricoesAgendamento={config.restricoesAgendamento}
      initialAtendimentoEspecialEnabled={config.atendimentoEspecialEnabled}
      initialAtendimentoEspecialDescricao={config.atendimentoEspecialDescricao}
      initialAskProfessionalEnabled={config.askProfessionalEnabled}
      agendaAccessToken={agendaAccessToken}
    />
  );
}
