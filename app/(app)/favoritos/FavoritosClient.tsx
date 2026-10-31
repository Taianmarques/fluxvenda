"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Star } from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";

type Favorita = {
  slug: string; nome: string; descricao: string; icone: string;
  moduloId: string; moduloNome: string; produtoSlug: string;
};

export function FavoritosClient({ inicial }: { inicial: Favorita[] }) {
  const [itens, setItens] = useState(inicial);
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? itens.filter(f => `${f.nome} ${f.descricao} ${f.moduloNome}`.toLowerCase().includes(q)) : itens;
  }, [itens, busca]);

  // Tirar dos favoritos: some da lista na hora; se a API falhar, volta para o lugar
  async function desfavoritar(f: Favorita) {
    const antes = itens;
    setItens(prev => prev.filter(i => i.slug !== f.slug));
    const res = await fetch(`/api/central/ferramentas/${f.slug}/favorito`, { method: "POST" }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok || d?.favorito) setItens(antes);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">

        {itens.length > 0 && (
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nas ferramentas" aria-label="Buscar nas ferramentas"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {itens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Star size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold">Você ainda não favoritou nenhuma ferramenta</p>
            <p className="mt-1 text-sm text-slate-500">Toque na estrela ao lado de uma ferramenta para ela aparecer aqui.</p>
            <Link href="/biblioteca" className="mt-5 inline-flex rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white">Ir para a Minha Biblioteca</Link>
          </div>
        ) : visiveis.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">Nenhum favorito encontrado. Tente outra palavra.</p>
        ) : (
          <ul className="space-y-2.5">
            {visiveis.map(f => {
              const cor = corDoModulo(f.moduloId);
              return (
                <li key={f.slug} className="relative flex items-center rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                  <Link href={`/biblioteca/${f.produtoSlug}/${f.slug}`} className="flex flex-1 items-center gap-3.5 min-w-0 p-3.5 pr-20">
                    <div className={`w-12 h-12 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}>
                      <CentralIcone nome={f.icone} size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{f.nome}</p>
                      {f.descricao && <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{f.descricao}</p>}
                      <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cor.etiqueta}`}>{f.moduloNome}</span>
                    </div>
                  </Link>
                  <div className="absolute right-3 flex items-center gap-1">
                    <button onClick={() => desfavoritar(f)} aria-label="Remover dos favoritos" title="Remover dos favoritos" className="p-1.5 rounded-lg hover:bg-slate-50">
                      <Star size={18} className="fill-amber-400 text-amber-400" />
                    </button>
                    <ChevronRight size={17} className="text-slate-300" aria-hidden />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
