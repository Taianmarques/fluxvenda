"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CRM_PAGES, type CrmPageKey } from "@/lib/crm-nav-config";

// Ícones vêm de CRM_PAGES (importado direto aqui, não recebido via prop) — um componente de
// ícone não pode ser serializado através da fronteira Server -> Client Component.
type PageItem = { key: string; label: string; summary: string };
type Category = { key: string; label: string; pages: PageItem[] };

export function AjudaListClient({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map(c => ({ ...c, pages: c.pages.filter(p => p.label.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)) }))
      .filter(c => c.pages.length > 0);
  }, [categories, query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar na central de ajuda..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum resultado para "{query}".</p>
      ) : (
        <div className="space-y-6">
          {filtered.map(cat => (
            <div key={cat.key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{cat.label}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {cat.pages.map(p => {
                  const Icon = CRM_PAGES[p.key as CrmPageKey]?.icon;
                  return (
                    <Link
                      key={p.key}
                      href={`/crm/hub/ajuda/${p.key}`}
                      className="flex items-start gap-3 bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 hover:border-blue-300 transition-colors"
                    >
                      {Icon && <Icon size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{p.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.summary}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
