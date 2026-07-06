import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  nome: z.string().min(1).max(40).optional(),
  descricao: z.string().max(300).optional(),
});

async function assertManager(userId: string, departamentoId: string) {
  const dep = await prisma.departamento.findUnique({ where: { id: departamentoId }, include: { team: true } });
  if (!dep || dep.team.managerId !== userId) return null;
  return dep;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ departamentoId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { departamentoId } = await params;
  if (!(await assertManager(userId, departamentoId))) {
    return NextResponse.json({ error: "Departamento não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.departamento.update({ where: { id: departamentoId }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ departamentoId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { departamentoId } = await params;
  if (!(await assertManager(userId, departamentoId))) {
    return NextResponse.json({ error: "Departamento não encontrado" }, { status: 404 });
  }

  // Membros e conversas ficam sem departamento (SetNull no schema)
  await prisma.departamento.delete({ where: { id: departamentoId } });
  return NextResponse.json({ ok: true });
}
