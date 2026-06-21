import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { levelFromXP } from "@/lib/utils";

const schema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1),
  source: z.enum([
    "LESSON_COMPLETE",
    "QUIZ_PASS",
    "OBJECTION_PRACTICE",
    "SCRIPT_GENERATE",
    "SIMULATION_ROUND",
    "MISSION_COMPLETE",
    "BADGE_UNLOCK",
    "DAILY_LOGIN",
    "SCANNER_COMPLETE",
  ]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { amount, reason, source } = body.data;

  const [transaction, profile] = await prisma.$transaction([
    prisma.xPTransaction.create({
      data: { profileId: userId, amount, reason, source },
    }),
    prisma.profile.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    }),
  ]);

  const newLevel = levelFromXP(profile.xp);
  if (newLevel > profile.level) {
    await prisma.profile.update({
      where: { id: userId },
      data: { level: newLevel },
    });
  }

  return NextResponse.json({ xp: profile.xp, level: newLevel, gained: amount });
}
