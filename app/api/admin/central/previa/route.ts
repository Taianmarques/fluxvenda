import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { camposSchema } from "@/lib/central-schema";
import { carregarPerfil } from "@/lib/central";
import { marcacoesSobrando, montarPromptFinal } from "@/lib/central-prompt";
import { validarEntradas } from "@/lib/central-entradas";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  prompt: z.string().min(1).max(20000),
  instrucoes: z.string().max(5000).default(""),
  formatoResposta: z.string().max(2000).default(""),
  campos: camposSchema,
  entradas: z.record(z.string(), z.unknown()).default({}),
});

// Pré-visualização no editor: monta o prompt que o cliente vai copiar, com o que está no editor
// (mesmo sem salvar) e o perfil de empresa do admin. Não chama IA e não grava nada.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const v = validarEntradas(body.data.campos, body.data.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const prompt = montarPromptFinal({
    prompt: body.data.prompt, instrucoes: body.data.instrucoes, formatoResposta: body.data.formatoResposta,
    entradas: v.entradas, perfil: await carregarPerfil(userId), campos: body.data.campos,
  });
  return NextResponse.json({ prompt, sobrando: marcacoesSobrando(prompt) });
}
