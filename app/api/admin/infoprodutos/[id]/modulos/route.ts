import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/central-shared";

const schema = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao módulo").max(80),
  descricao: z.string().trim().max(300).default(""),
  icone: z.string().trim().max(40).default("folder"),
});

// Cria um módulo dentro do produto (número de ordem = o próximo livre na plataforma)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id: produtoId } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const produto = await prisma.infoProduto.findUnique({ where: { id: produtoId }, select: { slug: true } });
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  const maior = await prisma.centralModulo.aggregate({ _max: { numero: true } });
  let id = `${produto.slug}-${slugify(body.data.nome)}`.slice(0, 80);
  if (await prisma.centralModulo.findUnique({ where: { id } })) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  const modulo = await prisma.centralModulo.create({ data: { ...body.data, id, produtoId, numero: (maior._max.numero ?? 0) + 1 } });
  return NextResponse.json({ modulo });
}
