import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";
import { SLUGS_RESERVADOS_BIBLIOTECA } from "@/lib/infoprodutos";

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const schema = z.object({
  nome: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Endereço: só letras minúsculas, números e hífen"),
  descricao: z.string().trim().max(2000),
  beneficio: z.string().trim().max(300),
  categoria: z.string().trim().min(1).max(60),
  icone: z.string().trim().max(40),
  // Capa: só imagem enviada pelo próprio editor (rota de imagens dos formulários)
  capaUrl: z.preprocess(vazioParaNull, z.string().regex(/^\/api\/formularios\/imagem\/[\w.-]+$/, "Capa inválida").nullable()),
  ordem: z.number().int().min(0).max(1000),
  publicado: z.boolean(),
  precoReferenciaCentavos: z.number().int().min(0).max(10_000_000).nullable(),
  inclusoNaPlataforma: z.boolean(),
  regrasQualidade: z.boolean(),
  anexoNecessario: z.preprocess(vazioParaNull, z.string().trim().max(200).nullable()),
  checkoutRef: z.preprocess(vazioParaNull, z.string().trim().max(100).nullable()),
}).partial();

// Edita um infoproduto (o editor manda tudo; a lista manda só { publicado })
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  if (body.data.slug) {
    if (SLUGS_RESERVADOS_BIBLIOTECA.includes(body.data.slug)) return NextResponse.json({ error: "Esse endereço é reservado" }, { status: 400 });
    const outro = await prisma.infoProduto.findUnique({ where: { slug: body.data.slug }, select: { id: true } });
    if (outro && outro.id !== id) return NextResponse.json({ error: "Já existe um produto com esse endereço" }, { status: 400 });
  }
  const produto = await prisma.infoProduto.update({ where: { id }, data: body.data }).catch(() => null);
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json({ produto });
}
