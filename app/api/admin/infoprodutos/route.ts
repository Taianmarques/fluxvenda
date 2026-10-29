import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { SLUGS_RESERVADOS_BIBLIOTECA } from "@/lib/infoprodutos";

const schema = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao produto").max(120),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Endereço: só letras minúsculas, números e hífen"),
});

// Cria um infoproduto em rascunho — o resto (capa, módulos, ferramentas, acesso) é editado depois
export async function POST(req: NextRequest) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (SLUGS_RESERVADOS_BIBLIOTECA.includes(body.data.slug)) return NextResponse.json({ error: "Esse endereço é reservado" }, { status: 400 });
  if (await prisma.infoProduto.findUnique({ where: { slug: body.data.slug } })) return NextResponse.json({ error: "Já existe um produto com esse endereço" }, { status: 400 });

  const ultimo = await prisma.infoProduto.aggregate({ _max: { ordem: true } });
  const produto = await prisma.infoProduto.create({ data: { ...body.data, ordem: (ultimo._max.ordem ?? 0) + 1 } });
  return NextResponse.json({ produto });
}
