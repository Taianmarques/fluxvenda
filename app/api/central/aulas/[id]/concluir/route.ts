import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { temAcessoAoProduto } from "@/lib/infoprodutos";

const schema = z.object({ concluida: z.boolean() });

// Marca/desmarca a aula como concluída pro usuário logado (progresso do curso)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { id } = await params;
  const aula = await prisma.centralAula.findUnique({ where: { id }, select: { id: true, publicada: true, modulo: { select: { produtoId: true } } } });
  if (!aula || !aula.publicada) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  if (!(await temAcessoAoProduto(userId, aula.modulo.produtoId))) return NextResponse.json({ error: "Você ainda não tem acesso a este produto" }, { status: 403 });

  const where = { profileId_aulaId: { profileId: userId, aulaId: aula.id } };
  if (body.data.concluida) {
    await prisma.aulaConcluida.upsert({ where, create: { profileId: userId, aulaId: aula.id }, update: {} });
  } else {
    await prisma.aulaConcluida.deleteMany({ where: { profileId: userId, aulaId: aula.id } });
  }
  return NextResponse.json({ concluida: body.data.concluida });
}
