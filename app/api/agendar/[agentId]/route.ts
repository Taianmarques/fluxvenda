import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSlotAvailable, type AvailabilityRule } from "@/lib/scheduling";
import { notifyProfessionalOfAppointment } from "@/lib/appointment-notify";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { z } from "zod";

const schema = z.object({
  serviceId: z.string().optional(),
  professionalId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  nome: z.string().trim().min(2).max(80),
  whatsapp: z.string().transform(v => v.replace(/\D/g, "")).pipe(z.string().min(10).max(13)),
});

// Cria o agendamento a partir da página pública — mesma lógica do POST autenticado de
// app/api/agentes/[agentId]/agendamentos, trocando a auth Clerk pelo gate schedulingEnabled.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: {
      id: true,
      schedulingEnabled: true,
      slotDurationMinutes: true,
      availability: true,
      askProfessionalEnabled: true,
      uazapiToken: true,
    },
  });
  if (!config?.schedulingEnabled) {
    return NextResponse.json({ error: "Agendamento indisponível" }, { status: 404 });
  }

  const raw = await req.text();
  if (raw.length > 2048) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const body = schema.safeParse(parsed);
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const scheduledAt = new Date(`${body.data.date}T${body.data.time}:00`);
  if (isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  if (scheduledAt.getTime() > Date.now() + 30 * 86400000) {
    return NextResponse.json({ error: "Data além do período de agendamento" }, { status: 400 });
  }

  const [service, professionals] = await Promise.all([
    body.data.serviceId
      ? prisma.service.findFirst({ where: { id: body.data.serviceId, agentConfigId: config.id, active: true } })
      : Promise.resolve(null),
    prisma.professional.findMany({ where: { agentConfigId: config.id, active: true } }),
  ]);
  if (body.data.serviceId && !service) return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });

  const durationMinutes = service?.durationMinutes ?? config.slotDurationMinutes;

  // Limite barato anti-abuso: um mesmo número não acumula mais que 3 agendamentos futuros
  const futuros = await prisma.appointment.count({
    where: { agentConfigId: config.id, contactNumber: body.data.whatsapp, status: "CONFIRMADO", scheduledAt: { gte: new Date() } },
  });
  if (futuros >= 3) {
    return NextResponse.json({ error: "Este número já tem agendamentos demais em aberto. Fale com a empresa pelo WhatsApp." }, { status: 429 });
  }

  // Resolução de profissional — mesma semântica do agente de IA (lib/whatsapp-inbound.ts)
  let professional = body.data.professionalId
    ? professionals.find(p => p.id === body.data.professionalId) ?? null
    : null;
  if (body.data.professionalId && !professional) {
    return NextResponse.json({ error: "Profissional inválido" }, { status: 400 });
  }
  if (!professional && professionals.length === 1) professional = professionals[0];

  if (!professional && professionals.length > 1) {
    if (config.askProfessionalEnabled) {
      return NextResponse.json({ error: "Escolha um profissional" }, { status: 400 });
    }
    // Auto-atribui o primeiro profissional livre nesse horário
    for (const pro of professionals) {
      const busyPro = await prisma.appointment.findMany({
        where: { agentConfigId: config.id, status: "CONFIRMADO", professionalId: pro.id },
        select: { scheduledAt: true, durationMinutes: true },
      });
      const availPro = (pro.availability ?? config.availability) as unknown as AvailabilityRule[];
      if (isSlotAvailable(availPro, durationMinutes, busyPro, scheduledAt)) {
        professional = pro;
        break;
      }
    }
    if (!professional) return NextResponse.json({ error: "Horário indisponível" }, { status: 409 });
  }

  // Guard de corrida: revalida contra os agendamentos confirmados no momento do POST
  const busy = await prisma.appointment.findMany({
    where: {
      agentConfigId: config.id,
      status: "CONFIRMADO",
      ...(professional ? { professionalId: professional.id } : {}),
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const availability = (professional?.availability ?? config.availability) as unknown as AvailabilityRule[];
  if (!isSlotAvailable(availability, durationMinutes, busy, scheduledAt)) {
    return NextResponse.json({ error: "Horário indisponível" }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      agentConfigId: config.id,
      contactName: body.data.nome,
      contactNumber: body.data.whatsapp,
      scheduledAt,
      durationMinutes,
      notes: "Agendado pela página pública",
      professionalId: professional?.id,
      serviceId: service?.id,
    },
  });

  // Avisa o profissional no WhatsApp (fire-and-forget)
  notifyProfessionalOfAppointment(appointment.id, "novo");

  // Confirmação pro cliente no WhatsApp da empresa (fire-and-forget, falha silenciosa)
  if (config.uazapiToken) {
    const quando = scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
      " às " + scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const texto = `Agendamento confirmado!${service ? ` ${service.name}` : ""} em ${quando}${professional ? ` com ${professional.name}` : ""}. Até lá!`;
    sendWhatsAppTextAsTeam(config.uazapiToken, body.data.whatsapp, texto).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    appointment: {
      scheduledAt: appointment.scheduledAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      serviceName: service?.name ?? null,
      professionalName: professional?.name ?? null,
    },
  });
}
