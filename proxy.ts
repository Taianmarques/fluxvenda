import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-shared";

// Roteiro público/privado idêntico ao que já existia com Clerk — só a fonte da sessão mudou
// (cookie JWT próprio em vez de sessionClaims do Clerk). Verificação 100% Edge-safe (jose):
// NÃO importe Prisma/bcrypt aqui.
function createRouteMatcher(patterns: string[]) {
  const regexes = patterns.map((p) => new RegExp(`^${p}$`));
  return (req: NextRequest) => regexes.some((r) => r.test(req.nextUrl.pathname));
}

const isPublicRoute = createRouteMatcher([
  "/",
  "/produtos(.*)",          // landing pages de CRM e Plataforma — públicas, sem login
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/entrar(.*)",           // página de convite — precisa estar autenticado mas não onboarded
  "/api/auth(.*)",         // login/registro/logout/me do sistema de auth próprio
  "/api/webhooks(.*)",
  "/api/onboarding(.*)",
  "/api/equipe/convite(.*)", // info pública do time para a página de convite
  "/api/cron(.*)",          // protegido por CRON_SECRET, não por sessão de usuário
  "/api/instagram/callback", // callback do OAuth — valida via OAuthState, sem sessão própria
  "/loja(.*)",              // catálogo público (PWA) — clientes finais, sem login
  "/agenda(.*)",            // agenda do profissional (PWA) — acesso por token secreto, sem login
  "/agendar(.*)",           // página pública de auto-agendamento (PWA) — clientes finais, sem login
  "/api/agendar(.*)",       // horários livres + criação de agendamento da página pública
  "/api/branding/icon(.*)", // ícones do manifest do PWA — navegador/instalador busca sem sessão
  "/api/midia(.*)",         // mídia do WhatsApp guardada localmente — nome de arquivo é um uuid
                            // imprevisível, mesmo modelo de acesso por token que /agenda e /agendar
]);

const isGestorRoute = createRouteMatcher(["/gestor(.*)", "/ferramentas(.*)"]);

export default async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Rotas públicas
  if (isPublicRoute(req)) return NextResponse.next();

  // Não autenticado → login
  if (!session) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Vendedor tentando acessar área de gestor
  if (isGestorRoute(req) && session.role === "VENDEDOR") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
