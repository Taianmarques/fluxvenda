import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PENDING_HOLD_MS } from "@/lib/scheduling";

// Polling da página pública enquanto o cliente paga o sinal — devolve só o status do
// agendamento (sem PII; o id é um cuid não-enumerável, escopado pelo agente da URL).
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: agentId }, { id: agentId }] },
    select: { id: true, schedulingEnabled: true },
  });
  if (!config?.schedulingEnabled) {
    return NextResponse.json({ error: "Agendamento indisponível" }, { status: 404 });
  }

  // Expiração lazy: se a reserva estourou os 30 min, o próprio polling a cancela
  await prisma.appointment.updateMany({
    where: { agentConfigId: config.id, status: "AGUARDANDO_PAGAMENTO", createdAt: { lt: new Date(Date.now() - PENDING_HOLD_MS) } },
    data: { status: "CANCELADO" },
  });

  const appointmentId = req.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 400 });

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, agentConfigId: config.id },
    select: { status: true },
  });
  if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

  return NextResponse.json({ status: appointment.status }, { headers: { "Cache-Control": "no-store" } });
}
