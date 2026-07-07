import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string; campanhaId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, campanhaId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const campanha = await prisma.campanha.findFirst({
    where: { id: campanhaId, agentConfigId: agentId },
    include: { destinatarios: { orderBy: { createdAt: "asc" } } },
  });
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  return NextResponse.json({
    campanha: {
      id: campanha.id,
      nome: campanha.nome,
      mensagem: campanha.mensagem,
      modo: campanha.modo,
      status: campanha.status,
      createdAt: campanha.createdAt.toISOString(),
      destinatarios: campanha.destinatarios.map(d => ({
        id: d.id,
        contactNumber: d.contactNumber,
        contactName: d.contactName,
        status: d.status,
        mensagemEnviada: d.mensagemEnviada,
        sentAt: d.sentAt?.toISOString() ?? null,
      })),
    },
  });
}

const patchSchema = z.object({
  status: z.enum(["ENVIANDO", "PAUSADA", "CANCELADA"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string; campanhaId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, campanhaId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const campanha = await prisma.campanha.findFirst({ where: { id: campanhaId, agentConfigId: agentId } });
  if (!campanha) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  if (campanha.status === "CONCLUIDA") return NextResponse.json({ error: "Campanha já concluída" }, { status: 400 });

  await prisma.campanha.update({
    where: { id: campanhaId },
    data: {
      status: body.data.status,
      // Retomar: agenda o próximo envio já; pausar/cancelar limpa o agendamento
      nextSendAt: body.data.status === "ENVIANDO" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
