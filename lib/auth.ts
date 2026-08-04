import "server-only";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, SessionPayload,
  signSessionToken, verifySessionToken,
} from "@/lib/auth-shared";

const BCRYPT_COST = 12;
// Hash fixo só pra gastar o mesmo tempo de bcrypt.compare quando o e-mail não existe —
// evita que o tempo de resposta do login revele quais e-mails estão cadastrados.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Q8y3qfL7Zz3XpMYY0FQ5Pkt1XKKfW";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) {
    await compare(password, DUMMY_HASH);
    return false;
  }
  return compare(password, storedHash);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ─── Shim compatível com @clerk/nextjs/server — mesma assinatura, mesmo formato de retorno
// (só o subconjunto de campos realmente usado no restante do código) ──────────────────────

export async function auth(): Promise<{
  userId: string | null;
  sessionClaims: { publicMetadata: { role: string; onboarded: boolean } } | null;
}> {
  const session = await getSession();
  if (!session) return { userId: null, sessionClaims: null };
  return {
    userId: session.userId,
    sessionClaims: { publicMetadata: { role: session.role, onboarded: session.onboarded } },
  };
}

export async function currentUser(): Promise<{
  id: string;
  emailAddresses: { emailAddress: string }[];
  firstName: string | null;
  lastName: string | null;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const profile = await prisma.profile.findUnique({ where: { id: session.userId }, select: { email: true, name: true } });
  if (!profile) return null;

  const [firstName, ...rest] = profile.name.split(" ");
  return {
    id: session.userId,
    emailAddresses: [{ emailAddress: profile.email }],
    firstName: firstName || null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}
