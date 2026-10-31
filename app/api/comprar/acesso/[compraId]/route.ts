import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { carregarAcessoCompra } from "@/lib/compras";

const schema = z.object({ t: z.string().min(10).max(200), senha: passwordSchema });

// Página de acesso da compra: conta criada por esta compra define a senha e já entra.
// A troca só acontece se a conta ainda estiver sem senha (updateMany condicional) — depois disso,
// o link não muda mais nada e a pessoa entra pelo login normal.
export async function POST(req: NextRequest, { params }: { params: Promise<{ compraId: string }> }) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Confira os dados" }, { status: 400 });
  const { compraId } = await params;

  const acesso = await carregarAcessoCompra(compraId, body.data.t);
  if (!acesso) return NextResponse.json({ error: "Link de acesso inválido ou vencido. Entre pelo login ou use “Esqueci minha senha”." }, { status: 403 });
  if (!acesso.profile || !acesso.podeCriarSenha) return NextResponse.json({ error: "Esta conta já tem senha. Entre pelo login." }, { status: 409 });

  const passwordHash = await hashPassword(body.data.senha);
  const r = await prisma.profile.updateMany({
    where: { id: acesso.profile.id, passwordHash: null },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
  });
  if (r.count === 0) return NextResponse.json({ error: "Esta conta já tem senha. Entre pelo login." }, { status: 409 });

  await createSession(acesso.profile.id, acesso.profile.role, acesso.profile.onboarded);
  return NextResponse.json({ ok: true });
}
