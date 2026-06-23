import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getInstanceStatus } from "@/lib/whatsapp";

// Reativa o agente pausado — só funciona se o WhatsApp ainda estiver conectado na UazAPI
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile || (profile.role !== "GESTOR" && profile.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return NextResponse.json({ error: "Equipe não encontrada" }, { status: 404 });

  const config = await prisma.agentConfig.findUnique({ where: { teamId: team.id } });
  if (!config?.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const status = await getInstanceStatus(config.uazapiToken);
  if (!status.connected) {
    return NextResponse.json({ error: "WhatsApp desconectado — escaneie o QR code antes de reativar" }, { status: 400 });
  }

  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: true } });

  return NextResponse.json({ ok: true });
}
