import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

// Dados pessoais da própria conta (Configurações). E-mail (login) e WhatsApp (verificado por código
// no cadastro) não mudam por aqui.
const schema = z.object({
  name: z.string().trim().min(2, { message: "Informe seu nome." }).max(80, { message: "Nome muito longo." }),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  await prisma.profile.update({ where: { id: userId }, data: { name: body.data.name } });
  return NextResponse.json({ ok: true });
}
