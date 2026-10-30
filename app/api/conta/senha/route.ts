import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";

// Troca de senha pela própria conta. Exige a senha atual — exceto em conta que ainda não tem senha
// (criada na compra de um kit ou migrada do Clerk), que define a primeira aqui.
const schema = z.object({ atual: z.string().optional(), nova: passwordSchema });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!profile) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  if (profile.passwordHash && !(await verifyPassword(body.data.atual ?? "", profile.passwordHash))) {
    return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: userId },
    // Invalida um link de redefinição pendente — a senha acabou de ser trocada
    data: { passwordHash: await hashPassword(body.data.nova), passwordResetToken: null, passwordResetExpiresAt: null },
  });
  return NextResponse.json({ ok: true });
}
