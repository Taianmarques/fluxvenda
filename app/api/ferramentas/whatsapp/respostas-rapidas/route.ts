import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ quickReplies: [] });

  const quickReplies = await prisma.quickReply.findMany({
    where: { agentConfigId: config.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ quickReplies });
}

const schema = z.object({
  title: z.string().min(1).max(40),
  content: z.string().min(1).max(2000),
});

// Qualquer atendente da equipe pode criar uma resposta rápida — fica disponível pra todo mundo
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const quickReply = await prisma.quickReply.create({
    data: { agentConfigId: config.id, title: body.data.title, content: body.data.content },
  });

  return NextResponse.json({ quickReply });
}
