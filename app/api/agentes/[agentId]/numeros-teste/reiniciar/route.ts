import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { phoneInList, samePhone } from "@/lib/phone-match";
import { emitChatEvent } from "@/lib/realtime";
import { z } from "zod";

const schema = z.object({ numero: z.string().regex(/^\d{8,15}$/) });

// Reinicia o atendimento de um número de teste: apaga a conversa dele (mensagens, oportunidades
// e envios agendados vão junto por cascade) pra próxima mensagem começar do zero, sem histórico
// nem estado de follow-up/transferência pra humano de testes anteriores. Só vale pra números
// cadastrados como teste do agente — nunca pra um cliente real.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { numero } = body.data;

  if (!phoneInList(config.learningModeTestNumbers, numero)) {
    return NextResponse.json({ error: "Esse número não está na lista de teste" }, { status: 400 });
  }

  // Filtro por sufixo só pra reduzir a busca; a igualdade de verdade (9º dígito/DDI) é o samePhone
  const candidatas = await prisma.conversation.findMany({
    where: { agentConfigId: config.id, isGroup: false, contactNumber: { endsWith: numero.slice(-8) } },
    select: { id: true, contactNumber: true },
  });
  const ids = candidatas.filter(c => samePhone(c.contactNumber, numero)).map(c => c.id);

  if (ids.length > 0) {
    await prisma.conversation.deleteMany({ where: { id: { in: ids } } });
    for (const id of ids) emitChatEvent(config.id, id);
  }

  return NextResponse.json({ ok: true, reiniciadas: ids.length });
}
