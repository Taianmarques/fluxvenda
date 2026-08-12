import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedTeam } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  departamentoId: z.string().nullable().optional(),
  accessProfileId: z.string().nullable().optional(),
  // ADMIN de propósito fora do enum aqui — é o super-admin da plataforma inteira (área /admin,
  // todos os clientes), nunca deve ser atribuível a um membro de equipe por essa rota.
  role: z.enum(["VENDEDOR", "FUNCIONARIO", "GESTOR"]).optional(),
});

// Define o departamento e/ou o perfil de acesso de um membro — só o gestor
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  const managedTeam = await getManagedTeam(userId);
  if (!member || !managedTeam || member.teamId !== managedTeam.id) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.departamentoId) {
    const dep = await prisma.departamento.findFirst({ where: { id: body.data.departamentoId, teamId: member.teamId } });
    if (!dep) return NextResponse.json({ error: "Departamento inválido" }, { status: 400 });
  }
  if (body.data.accessProfileId) {
    const perfil = await prisma.crmAccessProfile.findFirst({ where: { id: body.data.accessProfileId, teamId: member.teamId } });
    if (!perfil) return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }

  const { role, ...teamMemberData } = body.data;
  await prisma.teamMember.update({ where: { id: memberId }, data: teamMemberData });
  // role vive em Profile, não em TeamMember
  if (role !== undefined) {
    await prisma.profile.update({ where: { id: member.profileId }, data: { role } });
  }
  return NextResponse.json({ ok: true });
}

// Remove um membro da equipe — só o gestor da equipe pode.
// O perfil da pessoa continua existindo; ela apenas perde o acesso à equipe/CRM.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  const managedTeam = await getManagedTeam(userId);
  if (!member || !managedTeam || member.teamId !== managedTeam.id) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  await prisma.teamMember.delete({ where: { id: memberId } });

  // Conversas atribuídas a essa pessoa voltam para "sem atendente"
  await prisma.conversation.updateMany({
    where: { assignedToId: member.profileId, agentConfig: { teamId: member.teamId } },
    data: { assignedToId: null },
  });

  return NextResponse.json({ ok: true });
}
