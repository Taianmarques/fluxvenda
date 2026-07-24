import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0).optional(),
  precoPromocional: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
  imagemBase64: z.string().max(3_000_000).nullable().optional(),
  imagemMimeType: z.string().nullable().optional(),
  // Veículos
  marca: z.string().max(100).nullable().optional(),
  modelo: z.string().max(100).nullable().optional(),
  anoFabricacao: z.number().int().min(1900).max(2100).nullable().optional(),
  anoModelo: z.number().int().min(1900).max(2100).nullable().optional(),
  km: z.number().int().min(0).nullable().optional(),
  cor: z.string().max(50).nullable().optional(),
  cambio: z.enum(["MANUAL", "AUTOMATICO"]).nullable().optional(),
  combustivel: z.enum(["FLEX", "GASOLINA", "ETANOL", "DIESEL", "ELETRICO", "HIBRIDO", "GNV"]).nullable().optional(),
  placa: z.string().max(20).nullable().optional(),
  condicaoVeiculo: z.enum(["NOVO", "SEMINOVO", "USADO"]).nullable().optional(),
  // Imóveis
  tipoNegocio: z.enum(["VENDA", "ALUGUEL"]).nullable().optional(),
  tipoImovel: z.enum(["CASA", "APARTAMENTO", "COMERCIAL", "TERRENO"]).nullable().optional(),
  areaM2: z.number().min(0).nullable().optional(),
  quartos: z.number().int().min(0).nullable().optional(),
  banheiros: z.number().int().min(0).nullable().optional(),
  vagasGaragem: z.number().int().min(0).nullable().optional(),
  bairro: z.string().max(100).nullable().optional(),
  cidade: z.string().max(100).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || !(await userBelongsToAgentConfig(userId, product.agentConfigId))) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.product.update({ where: { id }, data: body.data });
  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || !(await userBelongsToAgentConfig(userId, product.agentConfigId))) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
