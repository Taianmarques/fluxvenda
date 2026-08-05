import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSystemPrompt } from "@/lib/agent-engine";
import { getAgentConfigAsManager } from "@/lib/team";
import { deleteInstance } from "@/lib/whatsapp";
import { unsubscribeInstagramWebhook } from "@/lib/instagram";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  return NextResponse.json({ config });
}

const schema = z.object({
  nome: z.string().min(1),
  tom: z.enum(["FORMAL", "PROXIMO", "CONSULTIVO"]),
  servicos: z.array(z.string()).default([]),
  objecoes: z.array(z.string()).default([]),
  horario: z.string().default(""),
  descricaoEmpresa: z.string().default(""),
  precos: z.string().default(""),
  enderecoContato: z.string().default(""),
  objetivo: z.string().max(2000).default(""),
  fluxoAtendimento: z.string().max(2000).default(""),
  comportamento: z.string().max(2000).default(""),
  fluxoGatilhos: z.array(z.object({
    gatilho: z.string().max(300),
    resposta: z.string().max(1000),
  })).max(30).default([]),
  followupEnabled: z.boolean().default(true),
  followupDelaysMinutes: z.array(z.number().int().min(1).max(43200)).max(10).default([1440]),
  emojiEnabled: z.boolean().default(false),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const existing = await getAgentConfigAsManager(userId, agentId);
  if (!existing) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const {
    nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
    objetivo, fluxoAtendimento, comportamento, fluxoGatilhos,
    followupEnabled, followupDelaysMinutes, emojiEnabled,
  } = body.data;

  const team = await prisma.team.findUnique({ where: { id: existing.teamId } });

  // Só regenera o system prompt se a personalidade/informações da empresa realmente mudaram
  const personaChanged = existing.nome !== nome || existing.tom !== tom || existing.horario !== horario
    || existing.descricaoEmpresa !== descricaoEmpresa || existing.precos !== precos || existing.enderecoContato !== enderecoContato
    || existing.objetivo !== objetivo || existing.fluxoAtendimento !== fluxoAtendimento || existing.comportamento !== comportamento
    || JSON.stringify(existing.servicos) !== JSON.stringify(servicos)
    || JSON.stringify(existing.objecoes) !== JSON.stringify(objecoes)
    || JSON.stringify(existing.fluxoGatilhos) !== JSON.stringify(fluxoGatilhos);

  const systemPrompt = personaChanged
    ? await generateSystemPrompt({
        nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
        objetivo, fluxoAtendimento, comportamento, fluxoGatilhos,
        segmento: existing.segmento, subsegmento: existing.subsegmento, empresa: team?.name,
      })
    : existing.systemPrompt;

  const config = await prisma.agentConfig.update({
    where: { id: agentId },
    data: {
      nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
      objetivo, fluxoAtendimento, comportamento, fluxoGatilhos,
      systemPrompt, followupEnabled, followupDelaysMinutes, emojiEnabled,
    },
  });

  return NextResponse.json({ config });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const existing = await getAgentConfigAsManager(userId, agentId);
  if (!existing) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  // Limpezas externas best-effort — a exclusão no banco acontece mesmo se falharem
  if (existing.uazapiToken) {
    await deleteInstance(existing.uazapiToken).catch(() => {});
  }
  const igConnection = await prisma.instagramConnection.findUnique({ where: { agentConfigId: agentId } });
  if (igConnection) {
    await unsubscribeInstagramWebhook(igConnection.instagramBusinessAccountId, igConnection.pageAccessToken).catch(() => {});
  }

  // Cascade remove conversas, mensagens, conexão Instagram, funis, execuções, etc.
  await prisma.agentConfig.delete({ where: { id: agentId } });

  return NextResponse.json({ ok: true });
}
