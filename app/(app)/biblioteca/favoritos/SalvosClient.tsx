"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";

type Salvo = {
  id: string; prompt: string; createdAt: string; entradas: Record<string, string>;
  ferramenta: { slug: string; nome: string; icone: string; moduloId: string; produtoSlug: string; publicada: boolean };
};

function resumo(e: Record<string, string>) {
  const v = Object.values(e).map(x => (x ?? "").trim()).filter(Boolean);
  return v.length ? v.slice(0, 2).join(" · ").slice(0, 120) : "Só com o perfil da empresa";
}

export function SalvosClient({ inicial }: { inicial: Salvo[] }) {
  const [itens, setItens] = useState(inicial);
  const [aberto, setAberto] = useState<string | null>(inicial[0]?.id ?? null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? itens.filter(i => `${i.ferramenta.nome} ${Object.values(i.entradas).join(" ")}`.toLowerCase().includes(q)) : itens;
  }, [itens, busca]);

  async function copiar(s: Salvo) {
    try { await navigator.clipboard.writeText(s.prompt); } catch { return; }
    setCopiado(s.id);
    setTimeout(() => setCopiado(c => (c === s.id ? null : c)), 2500);
  }

  async function desfavoritar(s: Salvo) {
    setItens(prev => prev.filter(i => i.id !== s.id));
    await fetch(`/api/central/geracoes/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salvo: false }),
    }).catch(() => null);
  }

  async function excluir(s: Salvo) {
    if (!confirm("Excluir este prompt? Ele sai dos favoritos e do histórico.")) return;
    setItens(prev => prev.filter(i => i.id !== s.id));
    await fetch(`/api/central/geracoes/${s.id}`, { method: "DELETE" }).catch(() => null);
  }

  const acao = "inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-2.5 py-1.5";

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Link href="/biblioteca" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Minha Biblioteca
        </Link>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star size={22} className="fill-amber-400 text-amber-400" /> Prompts favoritos</h1>
          <p className="text-slate-500 mt-1">Os prompts que você favoritou, prontos para copiar de novo ou reutilizar com outros dados.</p>
        </header>

        {itens.length > 3 && (
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nos favoritos..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500" />
          </div>
        )}

        {visiveis.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            {itens.length === 0 ? <>Nenhum prompt favorito ainda. Prepare um prompt numa ferramenta e toque em <strong className="text-slate-700">Favoritar prompt</strong>.</> : "Nada encontrado."}
          </div>
        ) : (
          <ul className="space-y-3">
            {visiveis.map(s => {
              const expandido = aberto === s.id;
              const cor = corDoModulo(s.ferramenta.moduloId);
              return (
                <li key={s.id} className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <button onClick={() => setAberto(expandido ? null : s.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left" aria-expanded={expandido}>
                    <div className={`w-9 h-9 rounded-lg ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}>
                      <CentralIcone nome={s.ferramenta.icone} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s.ferramenta.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{resumo(s.entradas)} · {new Date(s.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandido ? "rotate-180" : ""}`} />
                  </button>
                  {expandido && (
                    <div className="border-t border-slate-100 p-4 space-y-3">
                      <pre tabIndex={0} aria-label="Prompt" className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-slate-200 p-4 text-[13px] leading-relaxed text-slate-700 font-mono max-h-[420px] overflow-y-auto">{s.prompt}</pre>
                      <div className="flex flex-wrap items-center gap-1">
                        <button onClick={() => copiar(s)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white">
                          {copiado === s.id ? <Check size={15} /> : <Copy size={15} />} {copiado === s.id ? "Copiado!" : "Copiar prompt"}
                        </button>
                        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className={acao}>Abrir ChatGPT <ExternalLink size={13} /></a>
                        <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className={acao}>Abrir Claude <ExternalLink size={13} /></a>
                        {s.ferramenta.publicada && (
                          <Link href={`/biblioteca/${s.ferramenta.produtoSlug}/${s.ferramenta.slug}?usar=${s.id}`} className={acao}><RotateCcw size={14} /> Reutilizar</Link>
                        )}
                        <button onClick={() => desfavoritar(s)} className={acao}><Star size={14} /> Tirar dos favoritos</button>
                        <button onClick={() => excluir(s)} className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 rounded-lg px-2.5 py-1.5"><Trash2 size={14} /> Excluir</button>
                      </div>
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
