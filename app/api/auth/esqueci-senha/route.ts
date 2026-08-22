import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken, passwordResetExpiry } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email().trim().toLowerCase() });

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ ok: true }); // não vaza validação

    const profile = await prisma.profile.findUnique({ where: { email: body.data.email } });
    // Sempre responde ok — não revela se o e-mail existe ou não na base.
    if (!profile) return NextResponse.json({ ok: true });

    const passwordResetToken = generateToken();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() },
    });

    sendPasswordResetEmail(profile.email, profile.name, passwordResetToken, !profile.passwordHash).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/esqueci-senha]", err);
    return NextResponse.json({ ok: true }); // não vaza erro interno pro cliente aqui
  }
}
