"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Check, ChevronDown, Copy, Search, Trash2 } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { Markdown, paraTextoPuro } from "../Markdown";

type Salvo = { id: string; resultado: string; createdAt: string; titulo: string | null; ferramenta: { slug: string; nome: string; icone: string } };

export function SalvosClient({ inicial }: { inicial: Salvo[] }) {
  const [itens, setItens] = useState(inicial);
  const [aberto, setAberto] = useState<string | null>(inicial[0]?.id ?? null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? itens.filter(i => `${i.ferramenta.nome} ${i.resultado}`.toLowerCase().includes(q)) : itens;
  }, [itens, busca]);

  async function copiar(s: Salvo) {
    await navigator.clipboard.writeText(paraTextoPuro(s.resultado));
    setCopiado(s.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function remover(s: Salvo) {
    setItens(prev => prev.filter(i => i.id !== s.id));
    await fetch(`/api/central/geracoes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salvo: false }),
    }).catch(() => null);
  }

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900"><div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/central" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} /> Central de Ferramentas
      </Link>
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bookmark size={22} /> Resultados salvos</h1>
        <p className="text-slate-500 mt-1">Os textos que você salvou para usar de novo.</p>
      </header>

      {itens.length > 3 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nos salvos..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
        </div>
      )}

      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
          {itens.length === 0 ? <>Nada salvo ainda. Gere um resultado em uma ferramenta e toque em <strong className="text-slate-700">Salvar</strong>.</> : "Nada encontrado."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visiveis.map(s => {
            const expandido = aberto === s.id;
            return (
              <li key={s.id} className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <button onClick={() => setAberto(expandido ? null : s.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left" aria-expanded={expandido}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <CentralIcone nome={s.ferramenta.icone} size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{s.titulo || s.ferramenta.nome}</p>
                    <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandido ? "rotate-180" : ""}`} />
                </button>
                {expandido && (
                  <div className="border-t border-slate-200">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200">
                      <button onClick={() => copiar(s)} className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-2.5 py-1.5">
                        {copiado === s.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} {copiado === s.id ? "Copiado" : "Copiar"}
                      </button>
                      <Link href={`/central/${s.ferramenta.slug}`} className="text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-2.5 py-1.5">
                        Abrir ferramenta
                      </Link>
                      <button onClick={() => remover(s)} className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 rounded-lg px-2.5 py-1.5">
                        <Trash2 size={14} /> Remover dos salvos
                      </button>
                    </div>
                    <div className="p-5"><Markdown texto={s.resultado} /></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </div>
  );
}
