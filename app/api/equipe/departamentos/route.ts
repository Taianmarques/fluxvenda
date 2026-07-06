import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  if (!team) return NextResponse.json({ departamentos: [] });

  const departamentos = await prisma.departamento.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { membros: true } } },
  });
  return NextResponse.json({
    departamentos: departamentos.map(d => ({ id: d.id, nome: d.nome, descricao: d.descricao, membros: d._count.membros })),
  });
}

const schema = z.object({
  nome: z.string().min(1).max(40),
  descricao: z.string().max(300).default(""),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getManagerTeam(userId);
  if (!team) return NextResponse.json({ error: "Só o gestor cria departamentos" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const departamento = await prisma.departamento.create({
    data: { teamId: team.id, nome: body.data.nome, descricao: body.data.descricao },
  });
  return NextResponse.json({ departamento });
}
