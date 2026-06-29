import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createInstance } from "@/lib/whatsapp";
import { seedDefaultPipeline, seedDefaultLeadStatuses } from "@/lib/pipeline";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  segmento: z.string().default(""),
  subsegmento: z.string().default(""),
});

async function getOwnTeam(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;
  return prisma.team.findUnique({ where: { managerId: userId } });
}

// Cria um agente novo pra equipe (uma equipe pode ter vários, cada um seu número/CRM).
// A instância UazAPI é criada já aqui — precisa do id do AgentConfig pra nomear a instância.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getOwnTeam(userId);
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const config = await prisma.agentConfig.create({
    data: { teamId: team.id, nome: body.data.nome, segmento: body.data.segmento, subsegmento: body.data.subsegmento, active: false },
  });

  // Nome da instância só pode ser gerado depois que o AgentConfig já existe (precisa do id)
  const instanceName = `agent-${config.id}`.toLowerCase();
  const created = await createInstance(instanceName);

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: { uazapiInstance: created.name, uazapiToken: created.token },
  });

  await seedDefaultPipeline(config.id);
  await seedDefaultLeadStatuses(config.id);

  return NextResponse.json({ config: updated });
}
