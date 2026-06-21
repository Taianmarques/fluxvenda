import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const diagnostic = await prisma.diagnostic.findUnique({
      where: { id },
      include: { result: true },
    });

    if (!diagnostic) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Owner sempre pode ver; membros do time do dono também podem
    if (diagnostic.profileId !== userId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          profileId: userId,
          team: { managerId: diagnostic.profileId },
        },
      });
      if (!membership) return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }


    const result = diagnostic.result
      ? {
          summary: diagnostic.result.summary,
          strengths: safeJSON(diagnostic.result.strengths, []),
          weaknesses: safeJSON(diagnostic.result.weaknesses, []),
          actions: safeJSON(diagnostic.result.actions, []),
          priority: diagnostic.result.priority,
          classification: safeJSON(diagnostic.result.classification, {}),
          insights: safeJSON(diagnostic.result.insights, {}),
        }
      : null;

    return NextResponse.json({
      id: diagnostic.id,
      companyName: diagnostic.companyName,
      segment: diagnostic.segment,
      teamSize: diagnostic.teamSize,
      diagnosticType: diagnostic.diagnosticType,
      scoreLeads: diagnostic.scoreLeads,
      scoreProcess: diagnostic.scoreProcess,
      scoreTeam: diagnostic.scoreTeam,
      scoreKpis: diagnostic.scoreKpis,
      scoreTools: diagnostic.scoreTools,
      scoreValue: diagnostic.scoreValue,
      scoreRetention: diagnostic.scoreRetention,
      scoreMoney: diagnostic.scoreMoney,
      scoreTotal: diagnostic.scoreTotal,
      createdAt: diagnostic.createdAt,
      result,
    });
  } catch (err) {
    console.error("[scanner/get]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function safeJSON<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
