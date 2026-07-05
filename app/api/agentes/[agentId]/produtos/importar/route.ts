import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  products: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
    category: z.string().max(100).default(""),
    price: z.number().min(0),
    precoPromocional: z.number().min(0).nullable().optional(),
    stock: z.number().int().min(0).nullable().optional(),
  })).min(1).max(500),
});

// Importa produtos em lote (planilha CSV do sistema do cliente).
// Produto com mesmo nome (case-insensitive) é ATUALIZADO (preço/estoque/categoria);
// nomes novos são criados. Fotos não vêm na planilha — mantidas as existentes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Dados inválidos — confira as colunas da planilha." }, { status: 400 });
  }

  let created = 0;
  let updated = 0;

  for (const p of body.data.products) {
    const existing = await prisma.product.findFirst({
      where: { agentConfigId: agentId, name: { equals: p.name, mode: "insensitive" } },
      select: { id: true },
    });

    const data = {
      description: p.description,
      category: p.category,
      price: p.price,
      precoPromocional: p.precoPromocional ?? null,
      stock: p.stock ?? null,
    };

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data: { agentConfigId: agentId, name: p.name, ...data, active: true } });
      created++;
    }
  }

  return NextResponse.json({ created, updated });
}
