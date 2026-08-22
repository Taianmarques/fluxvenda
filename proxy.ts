import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function matchesAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((p) => p.test(pathname));
}

const PUBLIC_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/produtos(\/.*)?$/,          // landing pages de CRM e Plataforma — públicas, sem login
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/esqueci-senha(\/.*)?$/,
  /^\/redefinir-senha(\/.*)?$/,
  /^\/verificar-email(\/.*)?$/,
  /^\/onboarding(\/.*)?$/,
  /^\/entrar(\/.*)?$/,             // página de convite — precisa estar autenticado mas não onboarded
  /^\/api\/webhooks(\/.*)?$/,
  /^\/api\/onboarding(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,          // login, cadastro, logout, esqueci-senha, etc.
  /^\/api\/equipe\/convite(\/.*)?$/, // info pública do time para a página de convite
  /^\/api\/cron(\/.*)?$/,          // protegido por CRON_SECRET, não por sessão de usuário
  /^\/api\/instagram\/callback$/,  // callback do OAuth — valida via OAuthState, sem sessão
  /^\/loja(\/.*)?$/,               // catálogo público (PWA) — clientes finais, sem login
  /^\/agenda(\/.*)?$/,             // agenda do profissional (PWA) — acesso por token secreto
  /^\/agendar(\/.*)?$/,            // página pública de auto-agendamento (PWA)
  /^\/api\/agendar(\/.*)?$/,       // horários livres + criação de agendamento da página pública
  /^\/api\/branding\/icon(\/.*)?$/, // ícones do manifest do PWA — busca sem sessão
];

const GESTOR_ROUTES: RegExp[] = [/^\/gestor(\/.*)?$/, /^\/ferramentas(\/.*)?$/];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesAny(pathname, PUBLIC_ROUTES)) return NextResponse.next();

  const session = await decryptSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Não autenticado → login
  if (!session?.profileId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Vendedor tentando acessar área de gestor
  if (matchesAny(pathname, GESTOR_ROUTES) && session.role === "VENDEDOR") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
