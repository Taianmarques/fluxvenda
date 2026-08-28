import { currentUser } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { listMyAgentConfigs } from "@/lib/team";
import { CRM_PAGES, type CrmPageKey } from "@/lib/crm-nav-config";
import { CRM_HELP } from "@/lib/crm-help";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function AjudaArtigoPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const pageDef = CRM_PAGES[key as CrmPageKey];
  const artigo = CRM_HELP[key as CrmPageKey];
  if (!pageDef || !artigo) notFound();

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const result = await listMyAgentConfigs(user.id);
  if (!result) redirect("/crm");
  if (pageDef.managerOnly && !result.isManager) redirect("/crm/hub/ajuda");

  const firstAgentId = result.configs[0]?.id;
  const pageHref = firstAgentId ? `/crm/${firstAgentId}${pageDef.suffix}` : "/crm/hub/canais";

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-blue-50 text-slate-900 p-4 md:p-6 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto py-6">
        <Link href="/crm/hub/ajuda" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft size={13} /> Central de ajuda
        </Link>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <pageDef.icon size={20} className="text-blue-600 flex-shrink-0" />
              {pageDef.label}
            </h1>
            <Link
              href={pageHref}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5"
            >
              Abrir página <ExternalLink size={12} />
            </Link>
          </div>
          <p className="text-sm text-gray-500 mb-5">{artigo.summary}</p>

          {artigo.screenshot && (
            <div className="mb-6">
              <img
                src={artigo.screenshot}
                alt={`Tela de ${pageDef.label} no CRM`}
                className="w-full rounded-xl border border-gray-200 shadow-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">Print da tela (dados de exemplo).</p>
            </div>
          )}

          <div className="space-y-4">
            {artigo.blocks.map((block, i) => (
              <div key={i}>
                {block.heading && <p className="text-sm font-semibold text-slate-900 mb-1.5">{block.heading}</p>}
                {block.text && <p className="text-sm text-gray-700 leading-relaxed">{block.text}</p>}
                {block.bullets && (
                  <ul className="mt-1.5 space-y-1.5">
                    {block.bullets.map((b, j) => (
                      <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
