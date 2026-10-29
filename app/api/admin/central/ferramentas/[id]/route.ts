import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ferramentaSchema } from "@/lib/central-schema";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Edição parcial: o editor manda tudo, a lista manda só { publicada } ao alternar
const patchSchema = ferramentaSchema.partial();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (body.data.slug) {
    const outra = await prisma.centralFerramenta.findUnique({ where: { slug: body.data.slug }, select: { id: true } });
    if (outra && outra.id !== id) return NextResponse.json({ error: "Já existe uma ferramenta com esse identificador" }, { status: 400 });
  }
  if (body.data.moduloId && !(await prisma.centralModulo.findUnique({ where: { id: body.data.moduloId } }))) {
    return NextResponse.json({ error: "Módulo não encontrado" }, { status: 400 });
  }

  const ferramenta = await prisma.centralFerramenta.update({ where: { id }, data: body.data }).catch(() => null);
  if (!ferramenta) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  return NextResponse.json({ ferramenta });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  await prisma.centralFerramenta.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
