import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Busca agentes (qualquer time da plataforma) por nome do agente ou da empresa — alimenta o
// seletor "pra qual agente rotear" nos Formulários (LeadForm.agentConfigId).
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const agents = await prisma.agentConfig.findMany({
    where: q
      ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { team: { name: { contains: q, mode: "insensitive" } } }] }
      : undefined,
    select: { id: true, nome: true, uazapiToken: true, team: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    agents: agents.map(a => ({ id: a.id, nome: a.nome, teamName: a.team.name, temWhatsapp: Boolean(a.uazapiToken) })),
  });
}
