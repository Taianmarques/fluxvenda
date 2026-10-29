import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  salvo: z.boolean().optional(),
  titulo: z.string().trim().max(120).nullable().optional(),
  resultado: z.string().max(50000).optional(), // edição do texto antes de salvar
});

// Salvar/renomear/editar ou apagar uma geração do próprio usuário
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Texto corrigido à mão fica marcado como editado
  const data = { ...body.data, ...(body.data.resultado !== undefined && { editado: true }) };
  const r = await prisma.centralGeracao.updateMany({ where: { id, profileId: userId }, data });
  if (r.count === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.centralGeracao.deleteMany({ where: { id, profileId: userId } });
  return NextResponse.json({ ok: true });
}
