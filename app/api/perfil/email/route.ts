import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const schema = z.object({
  novoEmail: z.string().email({ message: "E-mail inválido." }).trim().toLowerCase(),
  senhaAtual: z.string().min(1, { message: "Informe sua senha atual." }),
});

// Trocar e-mail de acesso exige a senha atual — é uma credencial de login, não um dado
// de perfil qualquer. Contas sem senha (migradas do Clerk) precisam definir uma primeiro
// via "esqueci minha senha" antes de poder trocar o e-mail.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { novoEmail, senhaAtual } = body.data;

    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

    if (!profile.passwordHash) {
      return NextResponse.json({ error: "Sua conta ainda não tem senha definida. Use \"Esqueci minha senha\" pra criar uma antes de trocar o e-mail." }, { status: 400 });
    }
    if (!(await verifyPassword(senhaAtual, profile.passwordHash))) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }

    if (novoEmail === profile.email) {
      return NextResponse.json({ ok: true, email: profile.email });
    }

    const emEmUso = await prisma.profile.findUnique({ where: { email: novoEmail } });
    if (emEmUso) {
      return NextResponse.json({ error: "Esse e-mail já está em uso." }, { status: 400 });
    }

    const updated = await prisma.profile.update({
      where: { id: userId },
      data: { email: novoEmail },
    });

    return NextResponse.json({ ok: true, email: updated.email });
  } catch (err) {
    console.error("[perfil/email]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
