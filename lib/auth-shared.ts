// Núcleo de sessão compartilhado entre proxy.ts (Edge runtime) e lib/auth.ts (Node runtime).
// NUNCA importe Prisma, bcryptjs ou "next/headers" aqui — esse arquivo precisa continuar
// 100% compatível com o bundle de Edge do middleware (só Web Crypto via `jose`).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export type SessionPayload = {
  userId: string;
  role: string;
  onboarded: boolean;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role, onboarded: payload.onboarded })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.userId, role: payload.role, onboarded: Boolean(payload.onboarded) };
  } catch {
    return null;
  }
}
