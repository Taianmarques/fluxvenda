import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CONFIGURABLE_PAGE_KEYS, type CrmPageKey } from "@/lib/crm-nav-config";

async function getManagerTeam(userId: string) {
  return prisma.team.findUnique({ where: { managerId: userId } });
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gestor ou membro — resolve o time dos dois jeitos
  const team = await getManagerTeam(userId)
    ?? (await prisma.teamMember.findUnique({ where: { profileId: userId }, include: { team: true } }))?.team
    ?? null;
  if (!team) return NextResponse.json({ perfis: [] });

  const perfis = await prisma.crmAccessProfile.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { membros: true } } },
  });
  return NextResponse.json({
    perfis: perfis.map(p => ({ id: p.id, nome: p.nome, allowedPages: p.allowedPages, membros: p._count.membros })),
  });
}

const schema = z.object({
  nome: z.string().min(1).max(40),
  allowedPages: z.array(z.enum(CONFIGURABLE_PAGE_KEYS as [CrmPageKey, ...CrmPageKey[]])).default([]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getManagerTeam(userId);
  if (!team) return NextResponse.json({ error: "Só o gestor cria perfis de acesso" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const perfil = await prisma.crmAccessProfile.create({
    data: { teamId: team.id, nome: body.data.nome, allowedPages: body.data.allowedPages },
  });
  return NextResponse.json({ perfil });
}
