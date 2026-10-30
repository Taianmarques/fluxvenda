import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "./AppSidebar";
import { OneSignalInit } from "./OneSignalInit";
import { getEffectiveProducts, hasProduct } from "@/lib/products";
import { produtosLiberados } from "@/lib/infoprodutos";
import { MENU_TREINAMENTO_VISIVEL } from "@/lib/menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Verifica onboarding pelo DB (não depende do JWT da sessão, que pode estar desatualizado)
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { onboarded: true, role: true, name: true },
  });
  if (!profile?.onboarded) {
    // Quem já entrou numa equipe pelo convite faz o onboarding mínimo de membro
    const membership = await prisma.teamMember.findUnique({ where: { profileId: user.id }, select: { id: true } });
    redirect(membership ? "/onboarding/membro" : "/onboarding");
  }

  const isGestor = profile.role === "GESTOR" || profile.role === "ADMIN";
  const isAdmin = profile.role === "ADMIN";

  // Atendentes (membros de equipe, qualquer role) também acessam o CRM do número da equipe
  const isTeamMember = isGestor || Boolean(await prisma.teamMember.findUnique({ where: { profileId: user.id } }));

  // CRM e Plataforma podem ser vendidos separadamente — item de menu de um produto não
  // contratado continua visível, só fica com cadeado (ver AppSidebar + ProductGate)
  const products = await getEffectiveProducts(user.id);
  const hasCrm = hasProduct(products, "CRM");
  const hasPlataforma = hasProduct(products, "PLATAFORMA");
  const temInfoproduto = (await produtosLiberados(user.id)).size > 0;
  // Só-CRM sem nenhum kit: a home continua sendo a de boas-vindas do CRM (/dashboard)
  const homeCrm = hasCrm && !hasPlataforma && !temInfoproduto;

  // Quem não contratou a Plataforma não precisa ver os 9 itens individuais bloqueados —
  // colapsa tudo num único link de upsell (último do menu) que leva direto pra landing do produto.
  const NAV = [
    { href: homeCrm ? "/dashboard" : "/inicio", label: "Início", icon: "inicio" as const, show: true, locked: false },
    // Infoprodutos (100 prompts e kits complementares) — todo usuário vê; o acesso é por produto
    { href: "/biblioteca", label: "Minha Biblioteca", icon: "biblioteca" as const, show: true, locked: false },
    { href: "/biblioteca/favoritos", label: "Meus Prompts", icon: "prompts" as const, show: temInfoproduto, locked: false },
    { href: "/biblioteca/explorar", label: "Explorar Kits", icon: "kits" as const, show: true, locked: false },
    { href: "/biblioteca/meu-negocio", label: "Minha Empresa", icon: "empresa" as const, show: temInfoproduto, locked: false },
    ...(hasPlataforma ? [
      { href: "/dashboard",  label: "Meu Progresso", icon: "dashboard" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/scanner",    label: "Scanner",    icon: "scanner" as const, show: true, locked: false },
      // Ocultos do menu por enquanto (decisão de produto) — as páginas continuam existindo;
      // pra voltar, troque MENU_TREINAMENTO_VISIVEL pra true
      { href: "/missoes",    label: "Plano de Ação", icon: "missoes" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/simulacao",  label: "Simulação",  icon: "simulacao" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/trilhas",    label: "Trilhas",    icon: "trilhas" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/objecoes",   label: "Objeções",   icon: "objecoes" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/scripts",    label: "Scripts",    icon: "scripts" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/playbook",   label: "Playbook",   icon: "playbook" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/ranking",    label: "Ranking",    icon: "ranking" as const, show: MENU_TREINAMENTO_VISIVEL, locked: false },
      { href: "/gestor",     label: "Equipe",     icon: "equipe" as const, show: MENU_TREINAMENTO_VISIVEL && isGestor, locked: false },
    ] : []),
    { href: "/crm",         label: "CRM",         icon: "crm" as const, show: isTeamMember, locked: !hasCrm },
    { href: "/creditos",    label: "Créditos de IA", icon: "creditos" as const, show: isGestor, locked: false },
    { href: "/configuracoes", label: "Configurações", icon: "configuracoes" as const, show: true, locked: false },
    { href: "/admin",       label: "Super Admin", icon: "admin" as const, show: isAdmin, locked: false },
    ...(hasPlataforma ? [] : [
      { href: "/produtos/plataforma", label: "Plataforma B2B", icon: "plataforma" as const, show: true, locked: true },
    ]),
  ];

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-950 text-white overflow-hidden">
      <OneSignalInit userId={user.id} />
      <AppSidebar nav={NAV} profileName={profile.name} email={user.emailAddresses[0]?.emailAddress ?? ""} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
