import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateSystemPrompt } from "@/lib/agent-engine";
import { createInstance } from "@/lib/whatsapp";
import { seedDefaultPipeline, seedDefaultLeadStatuses } from "@/lib/pipeline";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  tom: z.enum(["FORMAL", "PROXIMO", "CONSULTIVO"]),
  servicos: z.array(z.string()).default([]),
  objecoes: z.array(z.string()).default([]),
  horario: z.string().default(""),
  descricaoEmpresa: z.string().default(""),
  precos: z.string().default(""),
  enderecoContato: z.string().default(""),
  followupEnabled: z.boolean().default(true),
  followupDelaysMinutes: z.array(z.number().int().min(1).max(43200)).max(10).default([1440]),
});

async function getOwnTeam(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  return prisma.team.findUnique({ where: { managerId: userId } });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getOwnTeam(userId);
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  // TODO(fase 3/4): este endpoint ainda assume "o" agente da equipe (o mais antigo) —
  // vira /api/agentes/[agentId] explícito quando a UI de múltiplos agentes existir.
  const config = await prisma.agentConfig.findFirst({ where: { teamId: team.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getOwnTeam(userId);
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const {
    nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
    followupEnabled, followupDelaysMinutes,
  } = body.data;

  const existing = await prisma.agentConfig.findFirst({ where: { teamId: team.id }, orderBy: { createdAt: "asc" } });

  // Só regenera o system prompt se a personalidade/informações da empresa realmente mudaram
  const personaChanged = !existing
    || existing.nome !== nome || existing.tom !== tom || existing.horario !== horario
    || existing.descricaoEmpresa !== descricaoEmpresa || existing.precos !== precos || existing.enderecoContato !== enderecoContato
    || JSON.stringify(existing.servicos) !== JSON.stringify(servicos)
    || JSON.stringify(existing.objecoes) !== JSON.stringify(objecoes);

  const systemPrompt = personaChanged
    ? await generateSystemPrompt({
        nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
        segmento: team.segment, empresa: team.name,
      })
    : existing!.systemPrompt;

  // Cria a instância na UazAPI automaticamente na primeira configuração — o cliente nunca
  // precisa acessar o painel da UazAPI, só escaneia o QR code que mostramos depois.
  let uazapiInstance = existing?.uazapiInstance ?? null;
  let uazapiToken = existing?.uazapiToken ?? null;
  if (!uazapiToken) {
    const instanceName = `team-${team.id}`.toLowerCase();
    const created = await createInstance(instanceName);
    uazapiInstance = created.name;
    uazapiToken = created.token;
  }

  // teamId não é mais @unique (uma equipe pode ter vários agentes) — upsert por teamId não
  // compila mais; como esse endpoint ainda é "o" agente da equipe (fase 1), decide manualmente
  // entre update (achou um existing) e create.
  const config = existing
    ? await prisma.agentConfig.update({
        where: { id: existing.id },
        data: {
          nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
          systemPrompt, uazapiInstance, uazapiToken, followupEnabled, followupDelaysMinutes,
        },
      })
    : await prisma.agentConfig.create({
        data: {
          teamId: team.id, nome, tom, servicos, objecoes, horario, descricaoEmpresa, precos, enderecoContato,
          systemPrompt, uazapiInstance, uazapiToken, active: false, followupEnabled, followupDelaysMinutes,
        },
      });

  if (!existing) {
    await seedDefaultPipeline(config.id);
    await seedDefaultLeadStatuses(config.id);
  }

  return NextResponse.json({ config });
}
