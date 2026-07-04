import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { sendInstagramDM } from "@/lib/instagram";
import { z } from "zod";

const schema = z.object({
  content: z.string().optional(),
  media: z.object({
    base64: z.string().min(1),
    type: z.enum(["image", "video", "audio", "document"]),
    fileName: z.string().optional(),
  }).optional(),
}).refine(d => d.content || d.media, { message: "content ou media é obrigatório" });

// Envia uma mensagem (texto e/ou mídia) como atendente humano — assume a conversa e pausa o agente de IA
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
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const isInstagram = conversation.contactNumber.startsWith("ig_");
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  let content = body.data.content ?? "";

  if (isInstagram) {
    if (!content) return NextResponse.json({ error: "Instagram DM só suporta texto" }, { status: 400 });
    const igConn = await prisma.instagramConnection.findUnique({ where: { agentConfigId: conversation.agentConfigId } });
    if (!igConn) return NextResponse.json({ error: "Conexão Instagram não encontrada" }, { status: 404 });
    const senderIgsid = conversation.contactNumber.replace("ig_", "");
    await sendInstagramDM(igConn.instagramBusinessAccountId, igConn.pageAccessToken, senderIgsid, content);
  } else {
    if (!config.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

    // Assinatura sai só no texto enviado pro cliente pelo WhatsApp
    let signaturePrefix = "";
    if (config.signatureEnabled) {
      const sender = await prisma.profile.findUnique({ where: { id: userId }, select: { name: true } });
      if (sender?.name) signaturePrefix = `*${sender.name}:*\n`;
    }

    if (body.data.media) {
      const { base64, type, fileName } = body.data.media;
      let sent;
      try {
        sent = await sendMediaAsTeam(config.uazapiToken, conversation.contactNumber, type, base64, {
          caption: body.data.content ? `${signaturePrefix}${body.data.content}` : (signaturePrefix || undefined),
          fileName,
        });
      } catch (err) {
        console.error("[mensagem] erro ao enviar mídia:", err);
        return NextResponse.json({ error: "Não foi possível enviar a mídia" }, { status: 502 });
      }

      try {
        const media = await downloadMessageMedia(config.uazapiToken, sent.messageid);
        mediaUrl = media.fileURL;
        mediaType = type;
      } catch (err) {
        console.error("[mensagem] erro ao obter url da mídia enviada:", err);
      }

      if (!content) content = fileName ? `[${type}] ${fileName}` : `[${type}]`;
    } else {
      await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, `${signaturePrefix}${content}`);
    }
  }

  const message = await prisma.message.create({
    data: { conversationId: id, role: "human", content, mediaUrl, mediaType, senderId: userId },
  });

  await prisma.conversation.update({
    where: { id },
    data: {
      humanTakeover: true,
      status: "ATIVO",
      // "Primeiro a assumir": quem manda a primeira mensagem manual fica responsável pela conversa
      ...(config.leadDistributionMode === "PRIMEIRO_A_ASSUMIR" && !conversation.assignedToId && { assignedToId: userId }),
    },
  });

  return NextResponse.json({ message });
}
