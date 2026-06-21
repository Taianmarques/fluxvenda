import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildScoreUpdate, clampScore, getAreaScore, recalcScoreTotal } from "@/lib/diagnostic-score";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { completed } = (await req.json()) as { completed: boolean };

  const action = await prisma.planAction.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!action || action.plan.profileId !== userId) {
    return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
  }

  if (action.completed === completed) {
    const diagnostic = await prisma.diagnostic.findUnique({ where: { id: action.plan.diagnosticId } });
    return NextResponse.json({
      completed: action.completed,
      areaScore: diagnostic ? getAreaScore(diagnostic, action.area) : 0,
      scoreTotal: diagnostic?.scoreTotal ?? 0,
    });
  }

  const diagnostic = await prisma.diagnostic.findUnique({ where: { id: action.plan.diagnosticId } });
  if (!diagnostic) return NextResponse.json({ error: "Diagnóstico não encontrado" }, { status: 404 });

  const currentAreaScore = getAreaScore(diagnostic, action.area);
  const delta = completed ? action.impact : -action.impact;
  const newAreaScore = clampScore(currentAreaScore + delta);
  const scoreUpdate = buildScoreUpdate(action.area, newAreaScore);
  const newScoreTotal = recalcScoreTotal({ ...diagnostic, ...scoreUpdate });

  const [updatedAction] = await prisma.$transaction([
    prisma.planAction.update({
      where: { id },
      data: { completed, completedAt: completed ? new Date() : null },
    }),
    prisma.diagnostic.update({
      where: { id: diagnostic.id },
      data: { ...scoreUpdate, scoreTotal: newScoreTotal },
    }),
  ]);

  return NextResponse.json({
    completed: updatedAction.completed,
    areaScore: newAreaScore,
    scoreTotal: newScoreTotal,
  });
}
