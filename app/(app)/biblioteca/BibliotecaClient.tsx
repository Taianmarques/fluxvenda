"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Box, Building2, CheckCircle2, Layers, Library, Search, Star, Wrench, X } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";

export type CardProduto = {
  slug: string; nome: string; descricao: string; beneficio: string; capaUrl: string | null;
  categoria: string; icone: string; rascunho: boolean;
  ferramentas: number; modulos: number;
  liberado: boolean;
  precoCentavos: number | null; // preço da oferta ativa (só pros não adquiridos)
};

function normalizar(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function preco(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Capa do card: imagem do admin ou, sem imagem, um fundo suave com o ícone do produto
function Capa({ p }: { p: CardProduto }) {
  return p.capaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.capaUrl} alt="" className="h-36 w-full object-cover" />
  ) : (
    <div className="h-36 bg-gradient-to-br from-indigo-100 via-white to-violet-100 flex items-center justify-center">
      <span className="w-14 h-14 rounded-2xl bg-white/80 text-indigo-600 flex items-center justify-center shadow-sm"><CentralIcone nome={p.icone} size={26} /></span>
    </div>
  );
}

function Conteudo({ p }: { p: CardProduto }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1"><Wrench size={13} /> {p.ferramentas} {p.ferramentas === 1 ? "ferramenta" : "ferramentas"}</span>
      <span className="inline-flex items-center gap-1"><Layers size={13} /> {p.modulos} {p.modulos === 1 ? "módulo" : "módulos"}</span>
    </p>
  );
}

// modo "explorar" (/biblioteca/explorar): só a vitrine dos kits que a pessoa ainda não tem
export function BibliotecaClient({ produtos, modo = "biblioteca" }: { produtos: CardProduto[]; modo?: "biblioteca" | "explorar" }) {
  const explorar = modo === "explorar";
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");

  const categorias = useMemo(() => [...new Set(produtos.map(p => p.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR")), [produtos]);
  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    return produtos.filter(p =>
      (categoria === "todas" || p.categoria === categoria) &&
      (!q || normalizar(`${p.nome} ${p.descricao} ${p.beneficio} ${p.categoria}`).includes(q)),
    );
  }, [produtos, busca, categoria]);
  const meus = filtrados.filter(p => p.liberado);
  const outros = filtrados.filter(p => !p.liberado);
  const temAlgum = produtos.some(p => p.liberado);

  const cartao = "group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md";
  const chip = (ativo: boolean) => `flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${ativo ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`;

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
              {explorar ? <><Box size={26} className="text-indigo-600" /> Explorar Kits</> : <><Library size={26} className="text-indigo-600" /> Minha Biblioteca</>}
            </h1>
            <p className="text-slate-500 mt-1.5">{explorar ? "Novos kits de ferramentas e prompts para ampliar seus resultados." : "Seus kits de ferramentas para vender mais com o ChatGPT e o Claude."}</p>
          </div>
          {temAlgum && !explorar && (
            <div className="flex gap-2">
              <Link href="/biblioteca/meu-negocio" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700"><Building2 size={15} /> Meu negócio</Link>
              <Link href="/biblioteca/favoritos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700"><Star size={15} /> Prompts favoritos</Link>
            </div>
          )}
        </header>

        {produtos.length > 1 && (
          <div className="space-y-3">
            <div className="relative max-w-xl">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              {busca && (
                <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={16} /></button>
              )}
            </div>
            {categorias.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setCategoria("todas")} className={chip(categoria === "todas")}>Todas</button>
                {categorias.map(c => <button key={c} onClick={() => setCategoria(c)} className={chip(categoria === c)}>{c}</button>)}
              </div>
            )}
          </div>
        )}

        {!explorar && <section>
          <h2 className="text-lg font-bold mb-3">Meus produtos</h2>
          {meus.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-sm">
              {temAlgum ? "Nenhum dos seus produtos corresponde à busca." : "Você ainda não tem produtos. Veja abaixo o que está disponível."}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meus.map(p => (
                <Link key={p.slug} href={`/biblioteca/${p.slug}`} className={cartao}>
                  <Capa p={p} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{p.categoria}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={12} /> Liberado</span>
                      {p.rascunho && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Rascunho</span>}
                    </div>
                    <h3 className="mt-2.5 font-semibold leading-snug">{p.nome}</h3>
                    {p.descricao && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.descricao}</p>}
                    <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                      <Conteudo p={p} />
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-1.5 transition-all">Acessar produto <ArrowRight size={15} /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>}

        {explorar && outros.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-sm">
            {busca || categoria !== "todas" ? "Nenhum kit corresponde à busca." : "Você já tem todos os kits disponíveis. Novos kits aparecerão aqui."}
          </div>
        )}

        {outros.length > 0 && (
          <section>
            {!explorar && <>
              <h2 className="text-lg font-bold">Outros produtos disponíveis</h2>
              <p className="text-sm text-slate-500 mt-0.5 mb-3">Kits que complementam o que você já tem.</p>
            </>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outros.map(p => (
                <div key={p.slug} className={cartao}>
                  <Capa p={p} />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="self-start rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{p.categoria}</span>
                    <h3 className="mt-2.5 font-semibold leading-snug">{p.nome}</h3>
                    {(p.beneficio || p.descricao) && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.beneficio || p.descricao}</p>}
                    <div className="mt-3"><Conteudo p={p} /></div>
                    <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                      {p.precoCentavos != null
                        ? <span className="text-lg font-bold tabular-nums">{preco(p.precoCentavos)}</span>
                        : <span className="text-sm text-slate-400">Em breve</span>}
                      <Link href={`/biblioteca/${p.slug}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 px-3.5 py-2 text-sm font-medium text-slate-700">
                        Conhecer produto
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
