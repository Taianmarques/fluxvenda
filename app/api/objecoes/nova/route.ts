import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const schema = z.object({
  objection: z.string().min(1),
  segment: z.string().min(1),
  product: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { objection, segment, product } = body.data;

  const systemPrompt = `Você é um cliente do segmento ${segment} que está recebendo uma proposta de venda de "${product}".
Sua principal objeção é: "${objection}".
Seja realista e resistente, mas aberto a bons argumentos. Faça perguntas desafiadoras.
Responda de forma natural como um comprador real. Seja direto e objetivo (máximo 3 frases por resposta).`;

  const openingMessage = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Olá! Gostaria de apresentar nossa solução para você.",
      },
    ],
  });

  const openingText = openingMessage.content[0].type === "text"
    ? openingMessage.content[0].text
    : "Pode falar, mas tenho pouco tempo.";

  const session = await prisma.objectionSession.create({
    data: {
      profileId: userId,
      objection,
      segment,
      product,
      messages: {
        create: [
          { role: "assistant", content: openingText },
        ],
      },
    },
  });

  return NextResponse.json({ id: session.id, opening: openingText });
}
