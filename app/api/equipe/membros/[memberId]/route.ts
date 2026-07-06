import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Remove um membro da equipe — só o gestor da equipe pode.
// O perfil da pessoa continua existindo; ela apenas perde o acesso à equipe/CRM.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id: memberId }, include: { team: true } });
  if (!member || member.team.managerId !== userId) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  await prisma.teamMember.delete({ where: { id: memberId } });

  // Conversas atribuídas a essa pessoa voltam para "sem atendente"
  await prisma.conversation.updateMany({
    where: { assignedToId: member.profileId, agentConfig: { teamId: member.teamId } },
    data: { assignedToId: null },
  });

  return NextResponse.json({ ok: true });
}
