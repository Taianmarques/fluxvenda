import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOwnAgentConfig } from "@/lib/team";

// Lista o gestor + atendentes da equipe — usado pro dropdown de atribuição manual de conversas
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOwnAgentConfig(userId);
  if (!config) return NextResponse.json({ attendants: [] });

  const team = await prisma.team.findUnique({
    where: { id: config.teamId },
    include: {
      manager: { select: { id: true, name: true } },
      members: { include: { profile: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!team) return NextResponse.json({ attendants: [] });

  const attendants = [
    { id: team.manager.id, name: team.manager.name, isManager: true },
    ...team.members.map(m => ({ id: m.profile.id, name: m.profile.name, isManager: false })),
  ];

  return NextResponse.json({ attendants });
}
