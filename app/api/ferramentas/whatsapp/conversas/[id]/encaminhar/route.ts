import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, type MediaType } from "@/lib/whatsapp";
import { emitChatEvent } from "@/lib/realtime";
import { z } from "zod";

const schema = z.object({
  messageId: z.string(),
  targetConversationIds: z.array(z.string()).min(1).max(10),
});

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

// Encaminha uma mensagem (texto ou mídia) pra outras conversas do mesmo agente — estilo
// WhatsApp: sem assinatura, marcada como "Encaminhada" nas threads de destino.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  if (!(await userBelongsToAgentConfig(userId, conversation.agentConfigId))) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const config = await prisma.agentConfig.findUnique({ where: { id: conversation.agentConfigId } });
  if (!config?.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const message = await prisma.message.findFirst({ where: { id: body.data.messageId, conversationId: id } });
  if (!message) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  if (message.role === "note") return NextResponse.json({ error: "Notas internas não podem ser encaminhadas" }, { status: 400 });

  // Só conversas do mesmo agente; Instagram fica de fora (DM não suporta esse fluxo)
  const targets = (await prisma.conversation.findMany({
    where: { id: { in: body.data.targetConversationIds }, agentConfigId: conversation.agentConfigId },
  })).filter(t => !t.contactNumber.startsWith("ig_") && t.id !== id);
  if (targets.length === 0) return NextResponse.json({ error: "Nenhum destino válido" }, { status: 400 });

  // Mídia: baixa uma vez do CDN e reaproveita o base64 pra todos os destinos
  let mediaBase64: string | null = null;
  if (message.mediaUrl && message.mediaType) {
    try {
      const res = await fetch(message.mediaUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_MEDIA_BYTES) {
        return NextResponse.json({ error: "Mídia grande demais pra encaminhar (máx. 10MB)" }, { status: 413 });
      }
      mediaBase64 = Buffer.from(buffer).toString("base64");
    } catch (err) {
      console.error("[encaminhar] erro ao baixar mídia de origem:", err);
      return NextResponse.json({ error: "Não foi possível carregar a mídia original" }, { status: 502 });
    }
  }

  const results: { conversationId: string; ok: boolean; error?: string }[] = [];

  for (const target of targets) {
    try {
      let waMessageId: string | null = null;
      if (mediaBase64 && message.mediaType) {
        const sent = await sendMediaAsTeam(config.uazapiToken, target.contactNumber, message.mediaType as MediaType, mediaBase64, {
          caption: message.content.startsWith("[") ? undefined : message.content || undefined,
        });
        waMessageId = sent.messageid ?? null;
      } else {
        waMessageId = await sendWhatsAppTextAsTeam(config.uazapiToken, target.contactNumber, message.content);
      }

      await prisma.message.create({
        data: {
          conversationId: target.id,
          role: "human",
          content: message.content,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType,
          senderId: userId,
          forwarded: true,
          waMessageId,
        },
      });
      emitChatEvent(conversation.agentConfigId, target.id);

      // Mesmo comportamento do envio manual: o atendente agiu na conversa de destino
      await prisma.conversation.update({
        where: { id: target.id },
        data: {
          humanTakeover: true,
          status: "ATIVO",
          ...(config.leadDistributionMode === "PRIMEIRO_A_ASSUMIR" && !target.assignedToId && { assignedToId: userId }),
        },
      });

      results.push({ conversationId: target.id, ok: true });
    } catch (err) {
      console.error("[encaminhar] erro no destino", target.id, err);
      results.push({ conversationId: target.id, ok: false, error: "Falha ao enviar" });
    }
  }

  return NextResponse.json({ results });
}
