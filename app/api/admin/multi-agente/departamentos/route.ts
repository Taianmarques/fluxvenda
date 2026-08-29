import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  nome: z.string().trim().min(1).max(40),
  descricao: z.string().trim().max(300).default(""),
  agenteInstrucoes: z.string().trim().max(4000).default(""),
});

// Cria um setor/departamento do agente multi-agente da FluxVenda — mesma tabela Departamento
// usada por qualquer equipe, só que escopada na equipe interna e com a instrução de IA
// preenchida (campo que a tela normal de Equipe > Departamentos não expõe).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const departamento = await prisma.departamento.create({
    data: { teamId: FLUXVENDA_TEAM_ID, ...body.data },
  });
  return NextResponse.json({ departamento });
}
