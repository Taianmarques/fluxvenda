import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateSystemPrompt } from "@/lib/agent-engine";
import { createInstance } from "@/lib/whatsapp";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  tom: z.enum(["FORMAL", "PROXIMO", "CONSULTIVO"]),
  servicos: z.array(z.string()).default([]),
  objecoes: z.array(z.string()).default([]),
  horario: z.string().default(""),
  followupEnabled: z.boolean().default(true),
  followupDelayHours: z.number().int().min(1).max(720).default(24),
  followupMaxAttempts: z.number().int().min(0).max(10).default(2),
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

  const config = await prisma.agentConfig.findUnique({ where: { teamId: team.id } });
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getOwnTeam(userId);
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { nome, tom, servicos, objecoes, horario, followupEnabled, followupDelayHours, followupMaxAttempts } = body.data;

  const existing = await prisma.agentConfig.findUnique({ where: { teamId: team.id } });

  // Só regenera o system prompt se a personalidade/configuração comercial realmente mudou
  const personaChanged = !existing
    || existing.nome !== nome || existing.tom !== tom || existing.horario !== horario
    || JSON.stringify(existing.servicos) !== JSON.stringify(servicos)
    || JSON.stringify(existing.objecoes) !== JSON.stringify(objecoes);

  const systemPrompt = personaChanged
    ? await generateSystemPrompt({ nome, tom, servicos, objecoes, horario, segmento: team.segment, empresa: team.name })
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

  const config = await prisma.agentConfig.upsert({
    where: { teamId: team.id },
    update: { nome, tom, servicos, objecoes, horario, systemPrompt, uazapiInstance, uazapiToken, followupEnabled, followupDelayHours, followupMaxAttempts },
    create: { teamId: team.id, nome, tom, servicos, objecoes, horario, systemPrompt, uazapiInstance, uazapiToken, active: false, followupEnabled, followupDelayHours, followupMaxAttempts },
  });

  return NextResponse.json({ config });
}
