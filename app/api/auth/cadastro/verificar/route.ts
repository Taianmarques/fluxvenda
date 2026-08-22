import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken, emailVerifyExpiry } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email";

const MAX_ATTEMPTS = 5;

const schema = z.object({
  email: z.string().email().trim().toLowerCase(),
  code: z.string().trim().length(6),
});

// Passo 2 do cadastro: confirma o código do WhatsApp e só aí cria o Profile de
// verdade + a sessão.
export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    const { email, code } = body.data;

    const pending = await prisma.pendingSignup.findUnique({ where: { email } });
    if (!pending) {
      return NextResponse.json({ error: "Cadastro não encontrado. Preencha o formulário novamente." }, { status: 404 });
    }
    if (pending.codeExpiresAt < new Date()) {
      await prisma.pendingSignup.delete({ where: { email } });
      return NextResponse.json({ error: "Código expirado. Preencha o formulário novamente." }, { status: 400 });
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingSignup.delete({ where: { email } });
      return NextResponse.json({ error: "Muitas tentativas erradas. Preencha o formulário novamente." }, { status: 400 });
    }

    if (pending.code !== code) {
      await prisma.pendingSignup.update({ where: { email }, data: { attempts: { increment: 1 } } });
      const remaining = MAX_ATTEMPTS - pending.attempts - 1;
      return NextResponse.json({ error: `Código incorreto. ${remaining > 0 ? `Tentativas restantes: ${remaining}.` : "Preencha o formulário novamente."}` }, { status: 400 });
    }

    const emailVerifyToken = generateToken();
    const profile = await prisma.profile.create({
      data: {
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        phone: pending.phone,
        emailVerifyToken,
        emailVerifyExpiresAt: emailVerifyExpiry(),
      },
    });

    await prisma.pendingSignup.delete({ where: { email } });

    sendVerificationEmail(profile.email, profile.name, emailVerifyToken).catch(() => {});

    await createSession(profile.id, profile.role, profile.onboarded);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/cadastro/verificar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
