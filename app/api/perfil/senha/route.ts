import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, passwordSchema } from "@/lib/auth/password";

const schema = z.object({
  senhaAtual: z.string().optional(),
  novaSenha: passwordSchema,
});

// Troca a senha do perfil logado. Se a conta já tem senha (imensa maioria), exige a atual
// pra confirmar. Contas migradas do Clerk sem senha ainda (passwordHash null) podem definir
// a primeira direto — não há uma senha antiga pra confirmar.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { senhaAtual, novaSenha } = body.data;

    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

    if (profile.passwordHash) {
      if (!senhaAtual) {
        return NextResponse.json({ error: "Informe sua senha atual." }, { status: 400 });
      }
      if (!(await verifyPassword(senhaAtual, profile.passwordHash))) {
        return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(novaSenha);
    await prisma.profile.update({ where: { id: userId }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[perfil/senha]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
