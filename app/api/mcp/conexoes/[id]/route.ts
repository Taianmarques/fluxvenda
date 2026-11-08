import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

// Desconecta o Claude (tela de Configurações): só a própria conexão da pessoa logada
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.mcpToken.updateMany({ where: { id, profileId: userId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (r.count === 0) return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
