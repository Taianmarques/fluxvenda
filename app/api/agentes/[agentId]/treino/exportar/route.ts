import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";

type Turno = { role: "user" | "assistant"; content: string };

// Gera o arquivo .jsonl no formato de fine-tuning de chat da OpenAI — cada linha é uma conversa
// completa, com o system prompt atual do agente na frente de cada exemplo (mesmo contexto que ele
// vai receber em produção). Só monta o arquivo; treinar/subir na OpenAI continua manual.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const exemplos = await prisma.trainingExample.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "asc" },
  });
  if (exemplos.length === 0) {
    return NextResponse.json({ error: "Nenhum exemplo cadastrado ainda" }, { status: 400 });
  }

  const systemPrompt = config.systemPrompt ?? "";
  const linhas = exemplos.map(ex => {
    const turnos = ex.turnos as unknown as Turno[];
    return JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, ...turnos.map(t => ({ role: t.role, content: t.content }))],
    });
  });

  const jsonl = linhas.join("\n");
  return new NextResponse(jsonl, {
    headers: {
      "Content-Type": "application/jsonl; charset=utf-8",
      "Content-Disposition": `attachment; filename="treino-${agentId}.jsonl"`,
    },
  });
}
