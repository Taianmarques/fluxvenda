import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";

// Reativa o agente pausado — precisa de pelo menos um canal conectado (WhatsApp ou Instagram)
export async function POST(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  let hasChannel = config.uazapiToken
    ? (await getInstanceStatus(config.uazapiToken)).connected
    : false;

  if (!hasChannel) {
    hasChannel = Boolean(
      await prisma.instagramConnection.findUnique({ where: { agentConfigId: config.id } })
    );
  }

  if (!hasChannel) {
    return NextResponse.json(
      { error: "Nenhum canal conectado — conecte o WhatsApp ou o Instagram antes de reativar" },
      { status: 400 }
    );
  }

  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: true } });

  return NextResponse.json({ ok: true });
}
