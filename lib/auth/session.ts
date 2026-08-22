import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/app/generated/prisma/client";

const COOKIE_NAME = "fv_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Lido sob demanda (não no topo do módulo) pra não derrubar o build caso este
// arquivo seja importado em algum caminho estático antes das env vars de runtime
// estarem disponíveis — só quebra de verdade se alguém tentar criar/ler uma sessão.
let cachedKey: Uint8Array | null = null;
function getEncodedKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) throw new Error("SESSION_SECRET não configurado");
  cachedKey = new TextEncoder().encode(secretKey);
  return cachedKey;
}

export type SessionPayload = {
  profileId: string;
  role: Role;
  onboarded: boolean;
  expiresAt: number;
};

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(getEncodedKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Chamado no login e no cadastro. Também reemitido depois do onboarding (ver
// updateSession) pra refletir role/onboarded novos sem precisar de novo login —
// equivalente ao session.reload() que o Clerk fazia no client.
export async function createSession(profileId: string, role: Role, onboarded: boolean) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encrypt({ profileId, role, onboarded, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

// Reemite a sessão atual com role/onboarded atualizados (pós-onboarding) sem
// exigir novo login.
export async function updateSession(patch: Partial<Pick<SessionPayload, "role" | "onboarded">>) {
  const cookieStore = await cookies();
  const current = await decrypt(cookieStore.get(COOKIE_NAME)?.value);
  if (!current) return;
  await createSession(current.profileId, patch.role ?? current.role, patch.onboarded ?? current.onboarded);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME as SESSION_COOKIE_NAME, decrypt as decryptSessionToken };
