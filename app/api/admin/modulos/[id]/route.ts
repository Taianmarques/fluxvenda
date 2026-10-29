import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";

const schema = z.object({
  nome: z.string().trim().min(2).max(80),
  descricao: z.string().trim().max(300),
  icone: z.string().trim().max(40),
}).partial();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const modulo = await prisma.centralModulo.update({ where: { id }, data: body.data }).catch(() => null);
  if (!modulo) return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });
  return NextResponse.json({ modulo });
}

// Só apaga módulo vazio — ferramentas precisam ser movidas ou apagadas antes (Central IA)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const total = await prisma.centralFerramenta.count({ where: { moduloId: id } });
  if (total > 0) return NextResponse.json({ error: `O módulo tem ${total} ferramenta(s). Mova ou apague as ferramentas antes.` }, { status: 400 });
  await prisma.centralModulo.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
