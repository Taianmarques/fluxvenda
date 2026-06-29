import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { disconnectInstance } from "@/lib/whatsapp";

// Desconecta (logout) o WhatsApp da instância. Mantém token/instância salvos — pode reconectar via QR code depois.
export async function POST(_req: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config?.uazapiToken) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  await disconnectInstance(config.uazapiToken);
  await prisma.agentConfig.update({ where: { id: config.id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
