import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
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

// Todos os campos são opcionais — a tela de configurar agente virou várias seções
// independentes (Personalidade, Sobre a empresa, Configuração comercial, Follow-up...),
// cada uma salvando só os campos que edita. Campo omitido = mantém o valor atual (ver
// merge com `existing` abaixo); NUNCA usar .default() aqui, senão um PATCH parcial
// zeraria os campos que a seção que está salvando nem mostra.
const schema = z.object({
  nome: z.string().min(1).optional(),
  tom: z.enum(["FORMAL", "PROXIMO", "CONSULTIVO"]).optional(),
  servicos: z.array(z.string()).optional(),
  objecoes: z.array(z.string()).optional(),
  horario: z.string().optional(),
  descricaoEmpresa: z.string().optional(),
  precos: z.string().optional(),
  enderecoContato: z.string().optional(),
  followupEnabled: z.boolean().optional(),
  followupDelaysMinutes: z.array(z.number().int().min(1).max(43200)).max(10).optional(),
  emojiEnabled: z.boolean().optional(),
  responseDelaySeconds: z.number().int().min(0).max(60).optional(),
  agentSignatureEnabled: z.boolean().optional(),
  instrucoesExtras: z.string().max(4000).optional(),
  treinoSimilaridadeMinima: z.number().min(0).max(1).optional(),
  treinoMaxExemplos: z.number().int().min(0).max(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const existing = await getAgentConfigAsManager(userId, agentId);
  if (!existing) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const d = body.data;

  // Valor efetivo = o que veio no PATCH, ou o que já estava salvo — assim uma seção que só
  // manda "nome" não sobrescreve servicos/objecoes/etc com vazio
  const nome = d.nome ?? existing.nome;
  const tom = d.tom ?? existing.tom;
  const servicos = d.servicos ?? existing.servicos;
  const objecoes = d.objecoes ?? existing.objecoes;
  const horario = d.horario ?? existing.horario;
  const descricaoEmpresa = d.descricaoEmpresa ?? existing.descricaoEmpresa;
  const precos = d.precos ?? existing.precos;
  const enderecoContato = d.enderecoContato ?? existing.enderecoContato;

  const team = await prisma.team.findUnique({ where: { id: existing.teamId } });

  // Só regenera o system prompt se a personalidade/informações da empresa realmente mudaram
  const personaChanged = existing.nome !== nome || existing.tom !== tom || existing.horario !== horario
    || existing.descricaoEmpresa !== descricaoEmpresa || existing.precos !== precos || existing.enderecoContato !== enderecoContato
    || JSON.stringify(existing.servicos) !== JSON.stringify(servicos)
    || JSON.stringify(existing.objecoes) !== JSON.stringify(objecoes);

  const systemPrompt = personaChanged
    ? await generateSystemPrompt({
        nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
        segmento: existing.segmento, subsegmento: existing.subsegmento, empresa: team?.name,
      })
    : existing.systemPrompt;

  const config = await prisma.agentConfig.update({
    where: { id: agentId },
    data: {
      nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato, systemPrompt,
      ...(d.followupEnabled !== undefined && { followupEnabled: d.followupEnabled }),
      ...(d.followupDelaysMinutes !== undefined && { followupDelaysMinutes: d.followupDelaysMinutes }),
      ...(d.emojiEnabled !== undefined && { emojiEnabled: d.emojiEnabled }),
      ...(d.responseDelaySeconds !== undefined && { responseDelaySeconds: d.responseDelaySeconds }),
      ...(d.agentSignatureEnabled !== undefined && { agentSignatureEnabled: d.agentSignatureEnabled }),
      ...(d.instrucoesExtras !== undefined && { instrucoesExtras: d.instrucoesExtras }),
      ...(d.treinoSimilaridadeMinima !== undefined && { treinoSimilaridadeMinima: d.treinoSimilaridadeMinima }),
      ...(d.treinoMaxExemplos !== undefined && { treinoMaxExemplos: d.treinoMaxExemplos }),
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
