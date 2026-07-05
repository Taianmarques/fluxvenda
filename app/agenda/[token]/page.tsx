import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { CalendarX2 } from "lucide-react";
import { AgendaClient, type AgendaAppointment } from "./AgendaClient";

// Agenda do profissional — acesso pelo token secreto do link, sem login.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const professional = await prisma.professional.findUnique({
    where: { accessToken: token },
    select: { name: true },
  });
  const title = professional ? `Agenda — ${professional.name}` : "Agenda";
  return {
    title,
    description: "Acompanhe seus agendamentos em tempo real.",
    manifest: `/agenda/${token}/manifest.webmanifest`,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function AgendaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const professional = await prisma.professional.findUnique({
    where: { accessToken: token },
    include: { agentConfig: { select: { team: { select: { name: true } } } } },
  });

  if (!professional) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <CalendarX2 size={44} className="mx-auto text-gray-300" />
          <p className="font-semibold text-lg">Link inválido</p>
          <p className="text-sm text-gray-500">Essa agenda não existe ou o link mudou. Peça o link atualizado para o gestor.</p>
        </div>
      </div>
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: professional.id,
      scheduledAt: { gte: startOfToday },
    },
    include: { service: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });

  const items: AgendaAppointment[] = appointments.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMinutes: a.durationMinutes,
    contactName: a.contactName,
    contactNumber: a.contactNumber,
    serviceName: a.service?.name ?? null,
    notes: a.notes,
    status: a.status,
  }));

  return (
    <AgendaClient
      professionalName={professional.name}
      storeName={professional.agentConfig.team?.name ?? ""}
      appointments={items}
    />
  );
}
