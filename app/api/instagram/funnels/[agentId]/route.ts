import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { userBelongsToAgentConfig } from "@/lib/team";

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const funnels = await prisma.instagramFunnel.findMany({
    where: { agentConfigId: agentId },
    include: { blocks: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ funnels });
}

// Substitui todos os funis atomicamente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { funnels } = await req.json() as {
    funnels: Array<{
      id?: string;
      name: string;
      active: boolean;
      dmTriggerEnabled: boolean;
      dmTriggerKeywords: string[];
      blocks: Array<{
        type: "MESSAGE" | "DELAY" | "CONDITION";
        order: number;
        content?: string;
        delayMinutes?: number;
        branches?: Array<{ keywords: string[]; label: string; funnelId: string | null }>;
      }>;
    }>;
  };

  // Mantém funis existentes (atualiza) e cria novos
  const existingFunnels = await prisma.instagramFunnel.findMany({
    where: { agentConfigId: agentId },
    select: { id: true },
  });
  const existingIds = new Set(existingFunnels.map((f) => f.id));
  const incomingIds = new Set(funnels.filter((f) => f.id && existingIds.has(f.id)).map((f) => f.id!));

  // Deleta funis removidos
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.instagramFunnel.deleteMany({ where: { id: { in: toDelete } } });
  }

  const upsertedFunnels: { tempId?: string; realId: string }[] = [];

  for (const f of funnels) {
    if (f.id && existingIds.has(f.id)) {
      // Atualiza
      await prisma.instagramFunnelBlock.deleteMany({ where: { funnelId: f.id } });
      await prisma.instagramFunnel.update({
        where: { id: f.id },
        data: {
          name: f.name,
          active: f.active,
          dmTriggerEnabled: Boolean(f.dmTriggerEnabled),
          dmTriggerKeywords: Array.isArray(f.dmTriggerKeywords) ? f.dmTriggerKeywords : [],
          blocks: {
            create: f.blocks.map((b, i) => ({
              type: b.type,
              order: i,
              content: b.content ?? null,
              delayMinutes: b.delayMinutes ?? null,
              branches: b.branches != null ? (b.branches as Prisma.InputJsonValue) : Prisma.JsonNull,
            })),
          },
        },
      });
      upsertedFunnels.push({ tempId: f.id, realId: f.id });
    } else {
      // Cria novo
      const created = await prisma.instagramFunnel.create({
        data: {
          agentConfigId: agentId,
          name: f.name,
          active: f.active,
          dmTriggerEnabled: Boolean(f.dmTriggerEnabled),
          dmTriggerKeywords: Array.isArray(f.dmTriggerKeywords) ? f.dmTriggerKeywords : [],
          blocks: {
            create: f.blocks.map((b, i) => ({
              type: b.type,
              order: i,
              content: b.content ?? null,
              delayMinutes: b.delayMinutes ?? null,
              branches: b.branches != null ? (b.branches as Prisma.InputJsonValue) : Prisma.JsonNull,
            })),
          },
        },
      });
      upsertedFunnels.push({ tempId: f.id, realId: created.id });
    }
  }

  return NextResponse.json({ ok: true, funnels: upsertedFunnels });
}
