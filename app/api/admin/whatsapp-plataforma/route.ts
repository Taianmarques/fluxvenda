import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getInstanceStatus, connectInstance } from "@/lib/whatsapp";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Status da instância GLOBAL da plataforma (UAZAPI_TOKEN) — é ela que envia as mensagens
// de boas-vindas do cadastro. Desconectada = ninguém recebe, e a falha é silenciosa.
export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.UAZAPI_TOKEN;
  if (!token) return NextResponse.json({ configured: false });

  try {
    const s = await getInstanceStatus(token);
    return NextResponse.json({
      configured: true,
      connected: s.connected,
      profileName: s.profileName,
      ownerNumber: s.ownerNumber,
    });
  } catch {
    return NextResponse.json({ configured: true, connected: false, error: "Falha ao consultar a UazAPI" });
  }
}

// Dispara a geração do QR de pareamento pra reconectar a instância da plataforma
export async function POST() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.UAZAPI_TOKEN;
  if (!token) return NextResponse.json({ error: "UAZAPI_TOKEN não configurado" }, { status: 400 });

  try {
    const s = await connectInstance(token);
    return NextResponse.json({ connected: s.connected, qrcode: s.qrcode, paircode: s.paircode });
  } catch {
    return NextResponse.json({ error: "Falha ao gerar o QR na UazAPI" }, { status: 502 });
  }
}
