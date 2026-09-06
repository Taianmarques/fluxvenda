import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Remove uma conta de exemplo por completo — a equipe fictícia (cascade cuida do agente,
// pipeline, conversas e mensagens) e, por fim, o gestor fictício que ela deixaria órfão.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { teamId } = await params;
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, isDemo: true, managerId: true } });
  if (!team?.isDemo) return NextResponse.json({ error: "Conta de exemplo não encontrada" }, { status: 404 });

  await prisma.team.delete({ where: { id: teamId } });
  await prisma.profile.delete({ where: { id: team.managerId } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
