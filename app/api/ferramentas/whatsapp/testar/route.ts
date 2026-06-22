import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  const config = await prisma.agentConfig.findUnique({ where: { teamId: team.id } });
  if (!config?.systemPrompt) return NextResponse.json({ error: "Agente ainda não configurado" }, { status: 400 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const reply = await runAgent(config.systemPrompt, body.data.history, body.data.message);

  return NextResponse.json({ reply });
}
