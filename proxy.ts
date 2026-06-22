import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/entrar(.*)",           // página de convite — precisa estar autenticado mas não onboarded
  "/api/webhooks(.*)",
  "/api/onboarding(.*)",
  "/api/equipe/convite(.*)", // info pública do time para a página de convite
  "/api/cron(.*)",          // protegido por CRON_SECRET, não por sessão de usuário
]);

const isGestorRoute = createRouteMatcher(["/gestor(.*)", "/ferramentas(.*)", "/whatsapp(.*)"]);
const isVendedorRoute = createRouteMatcher(["/dashboard(.*)", "/scanner(.*)", "/simulacao(.*)", "/trilhas(.*)", "/objecoes(.*)", "/scripts(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Rotas públicas
  if (isPublicRoute(req)) return NextResponse.next();

  // Não autenticado → login
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  const role = (sessionClaims?.publicMetadata as any)?.role as string | undefined;

  // Vendedor tentando acessar área de gestor
  if (isGestorRoute(req) && role === "VENDEDOR") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}, { clockSkewInMs: 180_000 });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
