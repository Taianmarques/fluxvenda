import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateToken, passwordResetExpiry } from "@/lib/auth/tokens";
import { sendTeamMemberAddedEmail } from "@/lib/email";
import { formatPhone, sendWhatsAppText, getWelcomeMessage } from "@/lib/whatsapp";
import { getManagedTeam } from "@/lib/team";
import { maybeAlertHotLead } from "@/lib/hot-lead-alert";

const schema = z.object({
  name: z.string().trim().min(2, { message: "Informe o nome." }),
  email: z.string().email({ message: "E-mail inválido." }).trim().toLowerCase(),
  phone: z.string().trim().optional(),
  coManager: z.boolean().optional(),
});

// Gestor (ou co-gestor) adiciona um membro direto na equipe, sem precisar do link de
// convite — a pessoa recebe um e-mail pra definir senha (ou só um aviso, se já tiver conta).
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const team = await getManagedTeam(userId);
    if (!team) return NextResponse.json({ error: "Só o gestor da equipe pode adicionar membros." }, { status: 403 });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { name, email, phone, coManager } = body.data;

    let profile = await prisma.profile.findUnique({ where: { email } });

    if (profile) {
      if (profile.id === userId) {
        return NextResponse.json({ error: "Esse e-mail já é o seu (gestor da equipe)." }, { status: 400 });
      }
      const [existingMembership, managesOtherTeam] = await Promise.all([
        prisma.teamMember.findUnique({ where: { profileId: profile.id } }),
        prisma.team.findUnique({ where: { managerId: profile.id } }),
      ]);
      if (existingMembership) {
        return NextResponse.json(
          { error: existingMembership.teamId === team.id ? "Essa pessoa já faz parte da equipe." : "Esse e-mail já pertence a outra equipe." },
          { status: 400 }
        );
      }
      if (managesOtherTeam) {
        return NextResponse.json({ error: "Esse e-mail já é gestor de outra equipe." }, { status: 400 });
      }
    }

    const formattedPhone = phone?.trim() ? formatPhone(phone.trim()) : undefined;
    const needsPassword = !profile || !profile.passwordHash;
    const passwordResetToken = needsPassword ? generateToken() : null;

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          name,
          email,
          phone: formattedPhone,
          role: "FUNCIONARIO",
          onboarded: true,
          ...(passwordResetToken && { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() }),
        },
      });
    } else if (passwordResetToken) {
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() },
      });
    }

    await prisma.teamMember.create({ data: { teamId: team.id, profileId: profile.id, coManager: coManager ?? false } });

    prisma.teamMember.count({ where: { teamId: team.id } }).then(count => {
      if (count >= 3) maybeAlertHotLead(team.id, `Adicionou ${count} pessoas na equipe durante o teste grátis.`);
    }).catch(() => {});

    sendTeamMemberAddedEmail(profile.email, profile.name, team.name, passwordResetToken).catch(() => {});
    if (formattedPhone) {
      getWelcomeMessage(profile.name, "FUNCIONARIO", team.name)
        .then(message => sendWhatsAppText(formattedPhone, message))
        .catch(() => {});
    }

    return NextResponse.json({ ok: true, needsPassword });
  } catch (err) {
    console.error("[equipe/membros]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
