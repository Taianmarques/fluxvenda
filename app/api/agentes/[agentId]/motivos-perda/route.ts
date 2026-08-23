import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

const MAX_MOTIVOS = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ motivos: [] });

  const motivos = await prisma.motivoPerda.findMany({
    where: { agentConfigId: result.config.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ motivos });
}

const schema = z.object({
  nome: z.string().trim().min(1, { message: "Informe o nome." }).max(60),
});

// Só o gestor (ou co-gestor) administra a lista — todo mundo escolhe dela ao marcar uma perda
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result || !result.isManager) return NextResponse.json({ error: "Só o gestor edita os motivos de perda" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const count = await prisma.motivoPerda.count({ where: { agentConfigId: result.config.id } });
  if (count >= MAX_MOTIVOS) {
    return NextResponse.json({ error: `Limite de ${MAX_MOTIVOS} motivos por agente` }, { status: 400 });
  }

  const motivo = await prisma.motivoPerda.create({
    data: { agentConfigId: result.config.id, nome: body.data.nome },
  });
  return NextResponse.json({ motivo });
}
