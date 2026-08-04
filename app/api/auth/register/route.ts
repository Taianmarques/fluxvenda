import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { name, email, password } = body.data;

  const existing = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Já existe uma conta com esse e-mail" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const profile = await prisma.profile.create({
    data: { name, email, passwordHash },
    select: { id: true, role: true, onboarded: true },
  });

  await setSessionCookie({ userId: profile.id, role: profile.role, onboarded: profile.onboarded });

  return NextResponse.json({ ok: true });
}
