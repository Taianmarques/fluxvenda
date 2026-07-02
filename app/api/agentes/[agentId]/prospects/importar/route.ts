import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const rowSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(8),
  empresa: z.string().default(""),
  segmento: z.string().default(""),
  regiao: z.string().default(""),
});

const schema = z.object({
  prospects: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const existentes = await prisma.prospect.findMany({
    where: { agentConfigId: agentId },
    select: { telefone: true },
  });
  const telSet = new Set(existentes.map(e => e.telefone));

  const novosRows = body.data.prospects
    .map(p => ({ ...p, telefone: p.telefone.replace(/\D/g, "") }))
    .filter(p => p.telefone.length >= 8 && !telSet.has(p.telefone));

  if (novosRows.length > 0) {
    await prisma.prospect.createMany({
      data: novosRows.map(p => ({ agentConfigId: agentId, ...p })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    total: body.data.prospects.length,
    novos: novosRows.length,
    duplicatas: body.data.prospects.length - novosRows.length,
  });
}
