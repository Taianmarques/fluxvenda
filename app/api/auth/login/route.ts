import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

// Limitador simples em memória — suficiente pra uma única instância (sem Redis).
// Reinicia sozinho quando a janela expira.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { email, password } = body.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(`${ip}:${email}`)) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, onboarded: true },
  });

  // Roda o compare mesmo sem perfil encontrado (hash dummy) — tempo de resposta uniforme,
  // não revela se o e-mail está cadastrado.
  const valid = await verifyPassword(password, profile?.passwordHash ?? null);
  if (!profile || !valid) {
    return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 });
  }

  await setSessionCookie({ userId: profile.id, role: profile.role, onboarded: profile.onboarded });

  return NextResponse.json({ ok: true });
}
