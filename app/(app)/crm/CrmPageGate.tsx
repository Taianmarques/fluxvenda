import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { hasCrmPageAccess } from "@/lib/crm-access";
import { CRM_PAGES, type CrmPageKey } from "@/lib/crm-nav-config";

export async function CrmPageGate({ pageKey, children }: { pageKey: CrmPageKey; children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (await hasCrmPageAccess(user.id, pageKey)) return <>{children}</>;

  return (
    <div className="min-h-full bg-gray-950 text-white p-6 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <Lock size={48} className="mx-auto text-gray-600" />
        <h1 className="text-2xl font-bold">Sem acesso</h1>
        <p className="text-gray-400">Seu perfil de acesso não inclui &quot;{CRM_PAGES[pageKey].label}&quot;. Fale com o gestor da equipe.</p>
      </div>
    </div>
  );
}
