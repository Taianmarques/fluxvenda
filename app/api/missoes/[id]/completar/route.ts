import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { levelFromXP } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const userMission = await prisma.userMission.findFirst({
    where: { id, profileId: userId, completed: false },
    include: { mission: true },
  });

  if (!userMission) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });

  const xpReward = userMission.mission.xpReward;

  await prisma.userMission.update({
    where: { id },
    data: { completed: true, completedAt: new Date(), progress: 100 },
  });

  const [, profile] = await prisma.$transaction([
    prisma.xPTransaction.create({
      data: {
        profileId: userId,
        amount: xpReward,
        reason: `Missão concluída: ${userMission.mission.title}`,
        source: "MISSION_COMPLETE",
      },
    }),
    prisma.profile.update({
      where: { id: userId },
      data: { xp: { increment: xpReward } },
    }),
  ]);

  const newLevel = levelFromXP(profile.xp);
  if (newLevel > profile.level) {
    await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
  }

  return NextResponse.json({ ok: true, xpGained: xpReward, xp: profile.xp, level: newLevel });
}
