import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userMissions = await prisma.userMission.findMany({
    where: { profileId: userId },
    include: { mission: true },
    orderBy: { mission: { createdAt: "desc" } },
  });

  const missions = userMissions.map((um) => {
    let condition: Record<string, unknown> = {};
    try { condition = JSON.parse(um.mission.condition); } catch {}
    return {
      id: um.id,
      title: um.mission.title,
      description: um.mission.description,
      xpReward: um.mission.xpReward,
      condition,
      progress: um.progress,
      completed: um.completed,
      completedAt: um.completedAt,
    };
  });

  return NextResponse.json({ missions });
}
