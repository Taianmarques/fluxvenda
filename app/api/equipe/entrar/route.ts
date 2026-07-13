import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { inviteCode } = await req.json();
    if (!inviteCode) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

    const team = await prisma.team.findUnique({ where: { invite: inviteCode } });
    if (!team) return NextResponse.json({ error: "Código de convite inválido" }, { status: 404 });

    // Não pode entrar na própria equipe como gestor
    if (team.managerId === userId) return NextResponse.json({ error: "Você é o gestor desta equipe" }, { status: 400 });

    // Já é membro de alguma equipe?
    const existing = await prisma.teamMember.findFirst({ where: { profileId: userId } });
    if (existing) {
      if (existing.teamId === team.id) return NextResponse.json({ ok: true, alreadyMember: true });
      return NextResponse.json({ error: "Você já faz parte de uma equipe" }, { status: 400 });
    }

    // Convidado que acabou de criar a conta ainda não tem Profile (ele nasce no onboarding) —
    // sem essa linha o create abaixo estoura a FK de TeamMember.profileId. Cria o mínimo com
    // os dados do Clerk; o onboarding completa o resto depois (nome, telefone, papel).
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      const user = await currentUser();
      await prisma.profile.create({
        data: {
          id: userId,
          email: user?.emailAddresses[0]?.emailAddress ?? `${userId}@placeholder.com`,
          name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Usuário",
        },
      });
    }

    await prisma.teamMember.create({
      data: { teamId: team.id, profileId: userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[equipe/entrar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
