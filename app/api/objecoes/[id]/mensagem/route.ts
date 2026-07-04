import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { logTokenUsage, getTeamIdForUser } from "@/lib/token-usage";
import { z } from "zod";

const schema = z.object({ content: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const session = await prisma.objectionSession.findFirst({
    where: { id, profileId: userId, completed: false },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });

  // Salva mensagem do usuário
  await prisma.objectionMessage.create({
    data: { sessionId: id, role: "user", content: body.data.content },
  });

  const systemPrompt = `Você é um cliente do segmento ${session.segment} recebendo proposta de "${session.product}".
Objeção principal: "${session.objection}".
Seja realista, resistente mas receptivo a bons argumentos. Máximo 3 frases.`;

  const messages = [
    ...session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: body.data.content },
  ];

  const [response, teamId] = await Promise.all([
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
    getTeamIdForUser(userId),
  ]);
  if (teamId) logTokenUsage({ teamId, provider: "anthropic", model: MODEL, feature: "objecao", inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens });

  const replyText = response.content[0].type === "text" ? response.content[0].text : "Entendo.";

  await prisma.objectionMessage.create({
    data: { sessionId: id, role: "assistant", content: replyText },
  });

  return NextResponse.json({ reply: replyText });
}
