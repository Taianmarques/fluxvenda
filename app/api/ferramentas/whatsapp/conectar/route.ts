import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { connectInstance, getInstanceStatus, registerAgentWebhook } from "@/lib/whatsapp";

async function getOwnAgentConfig(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) return null;

  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return null;

  return prisma.agentConfig.findUnique({ where: { teamId: team.id } });
}

// Dispara a geração do QR code / pairing code para a instância conectada
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config?.uazapiToken) return NextResponse.json({ error: "Conecte a instância antes" }, { status: 400 });

  const status = await connectInstance(config.uazapiToken);
  return NextResponse.json(status);
}

// Consulta o status da conexão (polling) — quando conectar, ativa o agente e registra o webhook
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config?.uazapiToken) return NextResponse.json({ error: "Conecte a instância antes" }, { status: 400 });

  const status = await getInstanceStatus(config.uazapiToken);

  if (status.connected && !config.active) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`;
    await registerAgentWebhook(config.uazapiToken, webhookUrl);
    await prisma.agentConfig.update({ where: { id: config.id }, data: { active: true } });
  }

  return NextResponse.json(status);
}
