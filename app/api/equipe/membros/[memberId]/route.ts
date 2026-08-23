import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  departamentoId: z.string().nullable().optional(),
  accessProfileId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(2, { message: "Informe o nome." }).optional(),
  email: z.string().trim().toLowerCase().email({ message: "E-mail inválido." }).optional(),
  phone: z.string().trim().optional().nullable(),
});

// Edita dados do membro (nome/e-mail/telefone), departamento, perfil de acesso e/ou
// ativo/inativo — só o gestor. Inativo = mantém no time mas perde o login (não apaga nada).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id: memberId }, include: { team: true } });
  if (!member || member.team.managerId !== userId) {
    return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { departamentoId, accessProfileId, active, name, email, phone } = body.data;

  if (departamentoId) {
    const dep = await prisma.departamento.findFirst({ where: { id: departamentoId, teamId: member.teamId } });
    if (!dep) return NextResponse.json({ error: "Departamento inválido" }, { status: 400 });
  }
  if (accessProfileId) {
    const perfil = await prisma.crmAccessProfile.findFirst({ where: { id: accessProfileId, teamId: member.teamId } });
    if (!perfil) return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }
  if (email) {
    const conflict = await prisma.profile.findUnique({ where: { email } });
    if (conflict && conflict.id !== member.profileId) {
      return NextResponse.json({ error: "Esse e-mail já está em uso." }, { status: 400 });
    }
  }

  const teamMemberData: { departamentoId?: string | null; accessProfileId?: string | null; active?: boolean } = {};
  if (departamentoId !== undefined) teamMemberData.departamentoId = departamentoId;
  if (accessProfileId !== undefined) teamMemberData.accessProfileId = accessProfileId;
  if (active !== undefined) teamMemberData.active = active;

  const profileData: { name?: string; email?: string; phone?: string | null } = {};
  if (name !== undefined) profileData.name = name;
  if (email !== undefined) profileData.email = email;
  if (phone !== undefined) profileData.phone = phone || null;

  await Promise.all([
    Object.keys(teamMemberData).length > 0 ? prisma.teamMember.update({ where: { id: memberId }, data: teamMemberData }) : null,
    Object.keys(profileData).length > 0 ? prisma.profile.update({ where: { id: member.profileId }, data: profileData }) : null,
  ]);

  return NextResponse.json({ ok: true });
}

// Remove um membro da equipe — só o gestor da equipe pode.
// O perfil da pessoa continua existindo; ela apenas perde o acesso à equipe/CRM.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id: memberId }, include: { team: true } });
  if (!member || member.team.managerId !== userId) {
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
