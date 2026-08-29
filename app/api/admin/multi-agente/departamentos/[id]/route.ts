import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const patchSchema = z.object({
  nome: z.string().trim().min(1).max(40).optional(),
  descricao: z.string().trim().max(300).optional(),
  agenteInstrucoes: z.string().trim().max(4000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existe = await prisma.departamento.findFirst({ where: { id, teamId: FLUXVENDA_TEAM_ID } });
  if (!existe) return NextResponse.json({ error: "Departamento não encontrado" }, { status: 404 });

  const departamento = await prisma.departamento.update({ where: { id }, data: body.data });
  return NextResponse.json({ departamento });
}
