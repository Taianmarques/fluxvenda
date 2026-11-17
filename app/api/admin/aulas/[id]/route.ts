import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { aulaSchema } from "@/lib/curso-admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = aulaSchema.partial().safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const aula = await prisma.centralAula.update({ where: { id }, data: body.data }).catch(() => null);
  if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  return NextResponse.json({ aula });
}

// Apagar a aula apaga também o progresso dos alunos nela
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  await prisma.centralAula.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
