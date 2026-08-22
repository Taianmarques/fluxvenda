import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { token, password } = body.data;

    const profile = await prisma.profile.findUnique({ where: { passwordResetToken: token } });
    if (!profile || !profile.passwordResetExpiresAt || profile.passwordResetExpiresAt < new Date()) {
      return NextResponse.json({ error: "Link inválido ou expirado. Peça uma nova redefinição." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        // Clicar num link enviado pro e-mail já comprova posse da caixa de entrada.
        emailVerifiedAt: profile.emailVerifiedAt ?? new Date(),
      },
    });

    await createSession(updated.id, updated.role, updated.onboarded);

    return NextResponse.json({ ok: true, onboarded: updated.onboarded });
  } catch (err) {
    console.error("[auth/redefinir-senha]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
