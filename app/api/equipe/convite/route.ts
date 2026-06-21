import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/equipe/convite?code=xxx — info pública do time para a página de convite
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { invite: code },
    include: {
      manager: { select: { name: true } },
      members: { select: { id: true } },
    },
  });

  if (!team) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  return NextResponse.json({
    name: team.name,
    segment: team.segment,
    size: team.size,
    managerName: team.manager.name,
    memberCount: team.members.length,
  });
}
