import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const schema = z.object({
  segment: z.string().min(1),
  leadRole: z.string().min(1),
  product: z.string().min(1),
  painPoint: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { segment, leadRole, product, painPoint } = body.data;

  const prompt = `Você é um especialista em vendas B2B. Crie scripts de vendas personalizados para:
- Segmento: ${segment}
- Cargo do lead: ${leadRole}
- Produto/serviço: ${product}
- Principal dor: ${painPoint}

Retorne um JSON com:
- coldCall: roteiro de cold call (máximo 200 palavras, natural e direto)
- followUpEmail: e-mail de follow-up (máximo 150 palavras)
- proposal: estrutura de proposta de valor (máximo 200 palavras)
- linkedinMsg: mensagem de conexão no LinkedIn (máximo 100 palavras)

Responda APENAS com o JSON, sem markdown.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const parsed = JSON.parse(text);

  await prisma.generatedScript.create({
    data: {
      profileId: userId,
      segment,
      leadRole,
      product,
      painPoint,
      coldCall: parsed.coldCall ?? "",
      followUpEmail: parsed.followUpEmail ?? "",
      proposal: parsed.proposal ?? "",
      linkedinMsg: parsed.linkedinMsg ?? "",
    },
  });

  return NextResponse.json(parsed);
}
