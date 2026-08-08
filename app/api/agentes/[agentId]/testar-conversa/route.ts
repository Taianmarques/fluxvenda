import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { processIncomingMessage, type ChannelAdapter } from "@/lib/whatsapp-inbound";
import { z } from "zod";

// Simulador completo: usa o MESMO pipeline real de atendimento (ferramentas do SDR, RAG,
// humanização, follow-up de tom) contra uma conversa de teste isolada (isSandbox: true) — uma
// por gestor, reaproveitada entre sessões. Nunca manda mensagem de verdade pro WhatsApp e nunca
// aparece na caixa de entrada, contatos ou relatórios reais (ver isSandbox nas queries do CRM).
function sandboxContactNumber(userId: string): string {
  return `sandbox-${userId}`;
}

const noOpAdapter: ChannelAdapter = {
  sendText: async () => null,
  sendMedia: async () => null,
};

async function loadMessages(agentConfigId: string, contactNumber: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { agentConfigId_contactNumber: { agentConfigId, contactNumber } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return conversation?.messages ?? [];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const messages = await loadMessages(agentId, sandboxContactNumber(userId));
  return NextResponse.json({ messages });
}

const postSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config?.systemPrompt) return NextResponse.json({ error: "Agente ainda não configurado" }, { status: 400 });

  const body = postSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const contactNumber = sandboxContactNumber(userId);

  // Garante isSandbox: true mesmo se processIncomingMessage criar a conversa do zero — evita
  // qualquer janela em que ela apareceria como conversa real antes desse flag ser setado.
  await prisma.conversation.upsert({
    where: { agentConfigId_contactNumber: { agentConfigId: agentId, contactNumber } },
    create: { agentConfigId: agentId, contactNumber, contactName: "Teste (simulação)", isSandbox: true },
    update: { isSandbox: true },
  });

  try {
    await processIncomingMessage(
      config,
      {
        text: body.data.message,
        caption: body.data.message,
        contactNumber,
        contactName: "Teste (simulação)",
        mediaUrl: null,
        mediaType: null,
        imageUrl: null,
        waMessageId: null,
        quotedWaMessageId: null,
      },
      noOpAdapter,
      { sandbox: true }
    );
  } catch (err) {
    console.error("[testar-conversa] erro ao processar mensagem de teste:", err);
    return NextResponse.json({ error: "Erro ao processar a mensagem de teste." }, { status: 502 });
  }

  const messages = await loadMessages(agentId, contactNumber);
  return NextResponse.json({ messages });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const contactNumber = sandboxContactNumber(userId);
  const conversation = await prisma.conversation.findUnique({
    where: { agentConfigId_contactNumber: { agentConfigId: agentId, contactNumber } },
    select: { id: true },
  });
  if (conversation) {
    await prisma.conversation.delete({ where: { id: conversation.id } }); // cascade: messages, opportunities, etc.
  }

  return NextResponse.json({ ok: true });
}
