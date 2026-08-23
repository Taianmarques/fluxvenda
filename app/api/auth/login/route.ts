import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

const INVALID = "E-mail ou senha inválidos.";

export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: INVALID }, { status: 400 });
    const { email, password } = body.data;

    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) return NextResponse.json({ error: INVALID }, { status: 401 });

    // Conta migrada do sistema antigo — ainda não tem senha própria definida.
    if (!profile.passwordHash) {
      return NextResponse.json(
        { error: "Sua conta precisa de uma nova senha. Clique em \"Esqueci minha senha\" pra definir uma.", code: "NEEDS_PASSWORD_RESET" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, profile.passwordHash);
    if (!valid) return NextResponse.json({ error: INVALID }, { status: 401 });

    const membership = await prisma.teamMember.findUnique({ where: { profileId: profile.id } });
    if (membership && !membership.active) {
      return NextResponse.json({ error: "Seu acesso foi desativado. Fale com o gestor da equipe." }, { status: 401 });
    }

    await createSession(profile.id, profile.role, profile.onboarded);

    return NextResponse.json({ ok: true, onboarded: profile.onboarded });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
