import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { generateToken, emailVerifyExpiry } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(2, { message: "Informe seu nome." }),
  email: z.string().email({ message: "E-mail inválido." }).trim().toLowerCase(),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { name, email, password } = body.data;

    const existing = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const emailVerifyToken = generateToken();

    const profile = await prisma.profile.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerifyToken,
        emailVerifyExpiresAt: emailVerifyExpiry(),
      },
    });

    sendVerificationEmail(email, name, emailVerifyToken).catch(() => {});

    await createSession(profile.id, profile.role, profile.onboarded);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/cadastro]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
