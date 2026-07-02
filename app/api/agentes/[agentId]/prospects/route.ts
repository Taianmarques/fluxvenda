import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ prospects: [] });

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const prospects = await prisma.prospect.findMany({
    where: { agentConfigId: agentId, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ prospects });
}

const createSchema = z.object({
  nome: z.string().min(1),
  empresa: z.string().default(""),
  telefone: z.string().min(8),
  segmento: z.string().default(""),
  regiao: z.string().default(""),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const prospect = await prisma.prospect.create({
    data: { agentConfigId: agentId, ...body.data },
  });
  return NextResponse.json({ prospect });
}
