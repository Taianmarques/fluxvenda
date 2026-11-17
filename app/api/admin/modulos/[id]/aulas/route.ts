import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { aulaSchema } from "@/lib/curso-admin";

// Cria uma aula no módulo (vai para o fim da lista; nasce como rascunho se não vier publicada)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id: moduloId } = await params;
  const body = aulaSchema.partial({ descricao: true, videoUrl: true, duracaoMin: true, ordem: true, publicada: true }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (!(await prisma.centralModulo.findUnique({ where: { id: moduloId }, select: { id: true } }))) return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });

  const ultima = await prisma.centralAula.aggregate({ where: { moduloId }, _max: { ordem: true } });
  const aula = await prisma.centralAula.create({
    data: { ...body.data, moduloId, ordem: body.data.ordem ?? (ultima._max.ordem ?? -1) + 1 },
  });
  return NextResponse.json({ aula });
}
