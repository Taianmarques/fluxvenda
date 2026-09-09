import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { generateToken, passwordResetExpiry } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Redefinição de senha disparada pelo super admin — gera o mesmo token usado no
// fluxo de "esqueci minha senha" e reenvia o e-mail com o link de /redefinir-senha,
// sem expor nem definir a senha diretamente aqui.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!profile) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const passwordResetToken = generateToken();
  await prisma.profile.update({
    where: { id: profile.id },
    data: { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() },
  });

  const sent = await sendPasswordResetEmail(profile.email, profile.name, passwordResetToken, !profile.passwordHash).catch(() => false);

  return NextResponse.json({ ok: true, emailSent: sent });
}
