import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";

// Substitui todos os fluxos do agente atomicamente + salva configurações gerais
export async function PUT(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { igCommentAutoDm, igCommentDmMessage, flows } = body as {
    igCommentAutoDm: boolean;
    igCommentDmMessage: string | null;
    flows: Array<{
      name: string;
      keywords: string[];
      replyMessage: string;
      funnelId: string | null;
      order: number;
      active: boolean;
    }>;
  };

  await prisma.$transaction([
    prisma.instagramCommentFlow.deleteMany({ where: { agentConfigId: agentId } }),
    prisma.agentConfig.update({
      where: { id: agentId },
      data: {
        igCommentAutoDm: Boolean(igCommentAutoDm),
        igCommentDmMessage: igCommentDmMessage?.trim() || null,
        igCommentFlows: {
          create: (flows ?? []).map((f, i) => ({
            name: f.name || `Condição ${i + 1}`,
            keywords: Array.isArray(f.keywords) ? f.keywords.map(String) : [],
            replyMessage: f.replyMessage ?? "",
            funnelId: f.funnelId ?? null,
            order: f.order ?? i,
            active: f.active !== false,
          })),
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
