import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { openai, MODEL } from "@/lib/openai";
import { levelFromXP } from "@/lib/utils";
import { AREA_QUESTIONS } from "@/lib/missao-questions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { answers } = (await req.json()) as { answers: Record<string, string> };

  const [userMission, profile] = await Promise.all([
    prisma.userMission.findFirst({
      where: { id, profileId: userId },
      include: { mission: true },
    }),
    prisma.profile.findUnique({ where: { id: userId }, select: { segment: true } }),
  ]);

  if (!userMission || userMission.completed) {
    return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
  }

  let condition: Record<string, unknown> = {};
  try { condition = JSON.parse(userMission.mission.condition); } catch {}

  const area = condition.area as string;
  const segment = profile?.segment ?? "B2B";
  const areaConfig = AREA_QUESTIONS[area];

  if (!areaConfig) return NextResponse.json({ error: "Área não configurada" }, { status: 400 });

  const prompt = areaConfig.solutionPrompt(answers, segment);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const solution = completion.choices[0]?.message?.content ?? "";

  // Marca missão como concluída, salva a solução e concede XP
  const xpReward = userMission.mission.xpReward;
  await prisma.userMission.update({
    where: { id },
    data: { completed: true, completedAt: new Date(), progress: 100, solutionText: solution },
  });

  const [, updatedProfile] = await prisma.$transaction([
    prisma.xPTransaction.create({
      data: {
        profileId: userId,
        amount: xpReward,
        reason: `Desafio concluído: ${userMission.mission.title}`,
        source: "MISSION_COMPLETE",
      },
    }),
    prisma.profile.update({ where: { id: userId }, data: { xp: { increment: xpReward } } }),
  ]);

  const newLevel = levelFromXP(updatedProfile.xp);
  if (newLevel > updatedProfile.level) {
    await prisma.profile.update({ where: { id: userId }, data: { level: newLevel } });
  }

  return NextResponse.json({ solution, xpGained: xpReward, level: newLevel });
}
