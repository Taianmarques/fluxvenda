import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { generateToken, passwordResetExpiry } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword, passwordSchema } from "@/lib/auth/password";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Redefinição de senha disparada pelo super admin. Dois modos:
// - body com { password }: define a senha direto, sem token nem e-mail (uso quando o
//   usuário não tem acesso ao e-mail cadastrado).
// - body vazio: gera o mesmo token do fluxo de "esqueci minha senha" e reenvia o e-mail
//   com o link de /redefinir-senha (comportamento original, sem mudanças).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const raw = await req.json().catch(() => ({}));

  if (typeof raw?.password === "string" && raw.password.length > 0) {
    const parsed = passwordSchema.safeParse(raw.password);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Senha inválida" }, { status: 400 });
    }
    const passwordHash = await hashPassword(parsed.data);
    await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return NextResponse.json({ ok: true, mode: "manual" });
  }

  const passwordResetToken = generateToken();
  await prisma.profile.update({
    where: { id: profile.id },
    data: { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() },
  });

  const sent = await sendPasswordResetEmail(profile.email, profile.name, passwordResetToken, !profile.passwordHash).catch(() => false);

  return NextResponse.json({ ok: true, mode: "email", emailSent: sent });
}
