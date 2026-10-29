import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { camposSchema } from "@/lib/central-schema";
import { carregarPerfil, gerarComFerramenta } from "@/lib/central";
import { validarEntradas } from "@/lib/central-entradas";
import { logTokenUsage } from "@/lib/token-usage";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  prompt: z.string().min(1).max(20000),
  instrucoes: z.string().max(5000).default(""),
  campos: camposSchema,
  entradas: z.record(z.string(), z.unknown()).default({}),
});

// Testa o prompt que está no editor (mesmo sem salvar), com o perfil de empresa do admin.
// Não grava no histórico de ninguém.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const v = validarEntradas(body.data.campos, body.data.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  try {
    const r = await gerarComFerramenta({ prompt: body.data.prompt, instrucoes: body.data.instrucoes, entradas: v.entradas, perfil: await carregarPerfil(userId), campos: body.data.campos });
    logTokenUsage({ teamId: FLUXVENDA_TEAM_ID, provider: r.provider, model: r.model, feature: "central-teste", inputTokens: r.inputTokens, outputTokens: r.outputTokens }).catch(() => {});
    return NextResponse.json({ resultado: r.texto, modelo: r.model });
  } catch (err) {
    console.error("[admin/central/testar]", err);
    return NextResponse.json({ error: "A IA não respondeu. Tente de novo." }, { status: 502 });
  }
}
