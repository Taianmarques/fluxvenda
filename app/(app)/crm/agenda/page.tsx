import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { getOwnAgentConfig } from "@/lib/team";
import { AgendaClient } from "./AgendaClient";

export default async function AgendaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const config = await getOwnAgentConfig(user.id);

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Calendar size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento antes de ativar agendamentos.</p>
          <Link href="/ferramentas/whatsapp" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AgendaClient
      initialSchedulingEnabled={config.schedulingEnabled}
      initialSlotDurationMinutes={config.slotDurationMinutes}
      initialAvailability={config.availability as any}
      initialAppointmentReminderHours={config.appointmentReminderHours}
    />
  );
}
