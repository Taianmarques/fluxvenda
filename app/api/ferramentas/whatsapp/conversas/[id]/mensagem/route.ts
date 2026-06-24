import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam, sendMediaAsTeam, downloadMessageMedia } from "@/lib/whatsapp";
import { z } from "zod";

const schema = z.object({
  content: z.string().optional(),
  media: z.object({
    base64: z.string().min(1),
    type: z.enum(["image", "video", "audio", "document"]),
    fileName: z.string().optional(),
  }).optional(),
}).refine(d => d.content || d.media, { message: "content ou media é obrigatório" });

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;
  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

// Envia uma mensagem (texto e/ou mídia) como atendente humano — assume a conversa e pausa o agente de IA
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config?.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  let content = body.data.content ?? "";

  if (body.data.media) {
    const { base64, type, fileName } = body.data.media;
    let sent;
    try {
      sent = await sendMediaAsTeam(config.uazapiToken, conversation.contactNumber, type, base64, {
        caption: body.data.content,
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
    await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, content);
  }

  const message = await prisma.message.create({
    data: { conversationId: id, role: "human", content, mediaUrl, mediaType },
  });

  await prisma.conversation.update({ where: { id }, data: { humanTakeover: true, status: "ATIVO" } });

  return NextResponse.json({ message });
}
