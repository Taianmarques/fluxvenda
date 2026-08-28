import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { listMyAgentConfigs } from "@/lib/team";
import { CRM_CATEGORIES } from "@/lib/crm-nav-config";
import { CRM_HELP } from "@/lib/crm-help";
import { AjudaListClient } from "./AjudaListClient";
import { LifeBuoy } from "lucide-react";

// Central de ajuda — acessível a qualquer pessoa da equipe (não só gestor), diferente da
// página de início. Conteúdo espelha CRM_CATEGORIES (mesmo menu do CRM) via lib/crm-help.ts.
export default async function AjudaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  if (!result) redirect("/crm");

  const categories = CRM_CATEGORIES.map(cat => ({
    key: cat.key,
    label: cat.label,
    pages: cat.pages
      .filter(p => !p.hiddenFromSidebar)
      .filter(p => !p.managerOnly || result.isManager)
      .filter(p => CRM_HELP[p.key])
      .map(p => ({ key: p.key, label: p.label, summary: CRM_HELP[p.key]!.summary })),
  })).filter(cat => cat.pages.length > 0);

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50 text-slate-900 p-4 md:p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <LifeBuoy size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Central de ajuda</h1>
            <p className="text-sm text-gray-500">Como usar cada parte do CRM FluxVenda.</p>
          </div>
        </div>

        <AjudaListClient categories={categories} />
      </div>
    </div>
  );
}
