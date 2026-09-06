import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listMyAgentConfigs, getAgentConfigWithRole } from "@/lib/team";
import { getCrmAllowedPages } from "@/lib/crm-access";
import { getMenuLogoDataUri } from "@/lib/branding";
import { getEffectiveProducts, hasProduct } from "@/lib/products";
import { CrmSidebar } from "../CrmSidebar";
import { CrmThemeProvider, CrmThemeScope } from "../CrmThemeContext";

export default async function CrmAgentLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  let [result, allowedPages, menuLogo, products] = await Promise.all([
    listMyAgentConfigs(user.id),
    getCrmAllowedPages(user.id),
    getMenuLogoDataUri(),
    getEffectiveProducts(user.id),
  ]);

  if (!result || !result.configs.some(c => c.id === agentId)) {
    // Não é da equipe real do usuário — pode ser um super admin visitando uma conta de
    // exemplo (Team.isDemo). Nesse caso o menu lateral mostra os agentes DAQUELA equipe
    // fictícia, não da equipe real do admin (ver lib/team.ts).
    const demoAccess = await getAgentConfigWithRole(user.id, agentId);
    if (!demoAccess) redirect("/crm");
    const demoConfigs = await prisma.agentConfig.findMany({ where: { teamId: demoAccess.config.teamId }, orderBy: { createdAt: "asc" } });
    result = { isManager: true, teamId: demoAccess.config.teamId, configs: demoConfigs };
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-950">
      <CrmSidebar agentId={agentId} agents={result.configs.map(c => ({ id: c.id, nome: c.nome }))} allowedPages={allowedPages} isManager={result.isManager} menuLogo={menuLogo} hasPlataforma={hasProduct(products, "PLATAFORMA")} />
      <div className="flex-1 overflow-hidden">
        <CrmThemeProvider>
          <CrmThemeScope>{children}</CrmThemeScope>
        </CrmThemeProvider>
      </div>
    </div>
  );
}
