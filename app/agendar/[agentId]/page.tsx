import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { getInstanceStatus } from "@/lib/whatsapp";
import { AgendarClient } from "./AgendarClient";
import { CalendarX } from "lucide-react";

// Página pública de auto-agendamento — sem sessão; revalida a cada 60s. Os horários em si
// são buscados client-side (API pública) pra nunca mostrar slot obsoleto/passado.
export const revalidate = 60;

// O segmento aceita o slug amigável (/agendar/nome-da-empresa) ou o id do agente —
// mesmo slug da loja (storeSlug), é só o nome do time slugificado
async function findBooking(idOrSlug: string) {
  return prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: idOrSlug }, { id: idOrSlug }] },
    select: {
      id: true,
      schedulingEnabled: true,
      slotDurationMinutes: true,
      askProfessionalEnabled: true,
      uazapiToken: true,
      storeLogoBase64: true,
      storeLogoMimeType: true,
      team: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ agentId: string }> }): Promise<Metadata> {
  const { agentId } = await params;
  const config = await findBooking(agentId);
  const name = config?.schedulingEnabled ? (config.team?.name || "Agendamento") : "Agendamento";
  const hasLogo = Boolean(config?.schedulingEnabled && config.storeLogoBase64);
  return {
    title: `${name} — Agendar horário`,
    description: `Agende um horário com ${name} — escolha o serviço, o dia e confirme na hora.`,
    manifest: `/agendar/${agentId}/manifest.webmanifest`,
    ...(hasLogo ? { icons: { icon: `/agendar/${agentId}/logo`, apple: `/agendar/${agentId}/logo` } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function Indisponivel() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <CalendarX size={44} className="mx-auto text-gray-300" />
        <p className="font-semibold text-lg">Agendamento indisponível</p>
        <p className="text-sm text-gray-500">Esta agenda não está ativa no momento. Se você recebeu este link, fale diretamente com a empresa.</p>
      </div>
    </div>
  );
}

export default async function AgendarPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await findBooking(agentId);

  if (!config || !config.schedulingEnabled) return <Indisponivel />;

  const [services, professionals, instanceStatus] = await Promise.all([
    prisma.service.findMany({
      where: { agentConfigId: config.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, durationMinutes: true },
    }),
    // Só id e nome — phone, accessToken e availability nunca chegam ao cliente final
    prisma.professional.findMany({
      where: { agentConfigId: config.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    // Número do WhatsApp da empresa — pro cliente cair na conversa após confirmar (igual à loja)
    config.uazapiToken
      ? getInstanceStatus(config.uazapiToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const whatsappNumber = instanceStatus?.ownerNumber?.replace(/\D/g, "") || null;

  return (
    <AgendarClient
      agentId={config.id}
      businessName={config.team?.name || "Agendamento"}
      whatsappNumber={whatsappNumber}
      logo={config.storeLogoBase64 ? `data:${config.storeLogoMimeType ?? "image/png"};base64,${config.storeLogoBase64}` : null}
      services={services}
      professionals={professionals}
      askProfessionalEnabled={config.askProfessionalEnabled}
      defaultDurationMinutes={config.slotDurationMinutes}
    />
  );
}
