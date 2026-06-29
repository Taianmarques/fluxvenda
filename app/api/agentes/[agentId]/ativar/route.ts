import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { getInstanceStatus } from "@/lib/whatsapp";

// Reativa o agente pausado — só funciona se o WhatsApp ainda estiver conectado na UazAPI
export async function POST(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config?.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const status = await getInstanceStatus(config.uazapiToken);
  if (!status.connected) {
    return NextResponse.json({ error: "WhatsApp desconectado — escaneie o QR code antes de reativar" }, { status: 400 });
  }

  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: true } });

  return NextResponse.json({ ok: true });
}
