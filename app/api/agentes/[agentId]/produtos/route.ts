import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ products });
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default(""),
  price: z.number().min(0),
  precoPromocional: z.number().min(0).nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      agentConfigId: agentId,
      name: body.data.name,
      description: body.data.description,
      category: body.data.category.trim(),
      price: body.data.price,
      stock: body.data.stock ?? null,
      precoPromocional: body.data.precoPromocional ?? null,
      imagemBase64: body.data.imagemBase64 ?? null,
      imagemMimeType: body.data.imagemMimeType ?? null,
      marca: body.data.marca ?? null,
      modelo: body.data.modelo ?? null,
      anoFabricacao: body.data.anoFabricacao ?? null,
      anoModelo: body.data.anoModelo ?? null,
      km: body.data.km ?? null,
      cor: body.data.cor ?? null,
      cambio: body.data.cambio ?? null,
      combustivel: body.data.combustivel ?? null,
      placa: body.data.placa ?? null,
      condicaoVeiculo: body.data.condicaoVeiculo ?? null,
      tipoNegocio: body.data.tipoNegocio ?? null,
      tipoImovel: body.data.tipoImovel ?? null,
      areaM2: body.data.areaM2 ?? null,
      quartos: body.data.quartos ?? null,
      banheiros: body.data.banheiros ?? null,
      vagasGaragem: body.data.vagasGaragem ?? null,
      bairro: body.data.bairro ?? null,
      cidade: body.data.cidade ?? null,
    },
  });

  return NextResponse.json({ product });
}
