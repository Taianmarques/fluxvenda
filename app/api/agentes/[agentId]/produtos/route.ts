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
  price: z.number().min(0),
  stock: z.number().int().min(0).nullable().optional(),
  imagemBase64: z.string().max(3_000_000).nullable().optional(),
  imagemMimeType: z.string().nullable().optional(),
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
      price: body.data.price,
      stock: body.data.stock ?? null,
      imagemBase64: body.data.imagemBase64 ?? null,
      imagemMimeType: body.data.imagemMimeType ?? null,
    },
  });

  return NextResponse.json({ product });
}
