import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAgent } from "@/lib/agent-engine";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
  // Opcional: id de um modelo fine-tunado da OpenAI (ex: "ft:gpt-4o-mini-2024-07-18:org::abc123")
  // pra testar um ajuste isolado, sem tocar no AgentConfig nem no atendimento real — some ao
  // fechar a aba, não fica salvo em lugar nenhum.
  modelId: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config?.systemPrompt) return NextResponse.json({ error: "Agente ainda não configurado" }, { status: 400 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  try {
    const reply = await runAgent(
      config.systemPrompt, body.data.history, body.data.message,
      body.data.modelId || undefined
    );
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[testar] erro ao chamar o modelo:", err);
    const msg = body.data.modelId ? "Não foi possível usar esse modelo — confira o id do fine-tuning." : "Erro ao testar o agente.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
