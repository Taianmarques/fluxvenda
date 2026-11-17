import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { comandoSchema } from "@/lib/curso-admin";

// Cria um comando pronto no módulo (vai para o fim da lista)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id: moduloId } = await params;
  const body = comandoSchema.partial({ descricao: true, ordem: true, publicada: true }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (!(await prisma.centralModulo.findUnique({ where: { id: moduloId }, select: { id: true } }))) return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });

  const ultimo = await prisma.centralComando.aggregate({ where: { moduloId }, _max: { ordem: true } });
  const comando = await prisma.centralComando.create({
    data: { ...body.data, moduloId, ordem: body.data.ordem ?? (ultimo._max.ordem ?? -1) + 1 },
  });
  return NextResponse.json({ comando });
}
