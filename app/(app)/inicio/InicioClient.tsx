"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ChevronRight, Search, X,
} from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";
import { UserMenu } from "../UserMenu";

export type FerramentaInicio = {
  id: string; slug: string; nome: string; descricao: string; icone: string; moduloId: string;
  produtoSlug: string; produtoNome: string;
};
export type ProdutoInicio = {
  slug: string; nome: string; descricao: string; capaUrl: string | null; icone: string;
  liberado: boolean; ferramentas: number; precoCentavos: number | null;
};
export type PassoInicio = { tipo: "diagnostico" | "plano" | "perfil" | "ferramenta"; titulo: string; descricao: string; href: string; icone: string; moduloId: string };
type Numeros = { produtos: number; ferramentas: number; modulos: number; salvos: number; preparados: number; preparadosMes: number };

function normalizar(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const cartao = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

// Busca do topo: ferramentas dos produtos liberados + os próprios produtos
function Busca({ ferramentas, produtos }: { ferramentas: FerramentaInicio[]; produtos: ProdutoInicio[] }) {
  const [q, setQ] = useState("");
  const termo = normalizar(q.trim());
  const resultados = useMemo(() => {
    if (termo.length < 2) return null;
    const prods = produtos
      .filter(p => normalizar(`${p.nome} ${p.descricao}`).includes(termo))
      .slice(0, 3)
      .map(p => ({ chave: `p-${p.slug}`, href: `/biblioteca/${p.slug}`, titulo: p.nome, sub: p.liberado ? "Produto" : "Kit disponível", icone: p.icone }));
    const ferrs = ferramentas
      .filter(f => normalizar(`${f.nome} ${f.descricao}`).includes(termo))
      .slice(0, 8)
      .map(f => ({ chave: f.id, href: `/biblioteca/${f.produtoSlug}/${f.slug}`, titulo: f.nome, sub: f.produtoNome, icone: f.icone }));
    return [...prods, ...ferrs];
  }, [termo, ferramentas, produtos]);

  return (
    <div className="relative flex-1 max-w-2xl">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar produtos, ferramentas ou prompts..."
        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
      />
      {q && <button onClick={() => setQ("")} aria-label="Limpar busca" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={16} /></button>}
      {resultados && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {resultados.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Nada encontrado para “{q.trim()}”.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1.5">
              {resultados.map(r => (
                <li key={r.chave}>
                  <Link href={r.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><CentralIcone nome={r.icone} size={16} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{r.titulo}</span>
                      <span className="block text-xs text-slate-500 truncate">{r.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CapaProduto({ p }: { p: ProdutoInicio }) {
  return p.capaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.capaUrl} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
  ) : (
    <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
      <CentralIcone nome={p.icone} size={20} />
    </span>
  );
}

// Início enxuto: saudação curta, o próximo passo em destaque, as ferramentas que a pessoa usa e os
// produtos dela. Kits à venda ficam no menu Explorar (aqui, só um atalho).
export function InicioClient({
  nome, empresa, produtos, ferramentas, destaque, passos, numeros,
}: {
  nome: string; empresa: string;
  produtos: ProdutoInicio[]; ferramentas: FerramentaInicio[]; destaque: FerramentaInicio[]; passos: PassoInicio[];
  numeros: Numeros;
}) {
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  const meus = produtos.filter(p => p.liberado);
  const temKitsAVenda = produtos.some(p => !p.liberado);
  const explorarHref = meus.length === 1 ? `/biblioteca/${meus[0].slug}` : meus.length ? "/biblioteca" : "/biblioteca/explorar";
  const [principal, ...outrosPassos] = passos;

  // Uso numa linha discreta (no lugar dos cartões de números)
  const uso = [
    numeros.preparados ? `${numeros.preparados} ${numeros.preparados === 1 ? "prompt preparado" : "prompts preparados"}${numeros.preparadosMes ? ` · ${numeros.preparadosMes} este mês` : ""}` : null,
    numeros.salvos ? `${numeros.salvos} ${numeros.salvos === 1 ? "salvo" : "salvos"}` : null,
  ].filter(Boolean).join(" · ");

  const rotulo = "font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-slate-500";

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      {/* Topo: busca + usuário */}
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <Busca ferramentas={ferramentas} produtos={produtos} />
          <div className="hidden sm:flex items-center gap-3 ml-auto pl-4 border-l border-slate-200">
            <UserMenu name={nome} openDirection="down" align="end" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate max-w-48">{nome}</p>
              <p className="text-xs text-slate-500 truncate max-w-48">{empresa || "Minha empresa"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-12">
        {/* Saudação */}
        <section>
          {primeiroNome && <p className="text-slate-500">Olá, {primeiroNome}.</p>}
          <h1 className="mt-1 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Sua central de vendas <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">com IA.</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href={explorarHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white">
              Explorar ferramentas <ArrowRight size={16} />
            </Link>
            {uso && <p className="text-sm text-slate-500">{uso}</p>}
          </div>
        </section>

        {/* Próximo passo: um em destaque, os outros discretos */}
        {principal && (
          <section>
            <h2 className={`${rotulo} mb-3`}>Próximo passo</h2>
            <Link href={principal.href} className={`group ${cartao} p-5 md:p-6 flex items-center gap-4 hover:border-blue-300 transition-colors`}>
              <span className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><CentralIcone nome={principal.icone} size={22} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold leading-snug">{principal.titulo}</span>
                {principal.descricao && <span className="block mt-0.5 text-sm text-slate-500">{principal.descricao}</span>}
              </span>
              <ArrowRight size={20} className="text-blue-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </Link>
            {outrosPassos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 px-1">
                {outrosPassos.map(p => (
                  <Link key={p.href} href={p.href} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                    <ChevronRight size={15} className="text-blue-600" /> {p.titulo}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Continue usando: favoritas e mais usadas */}
        {destaque.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className={rotulo}>Continue usando</h2>
              <Link href="/favoritos" className="text-sm text-slate-500 hover:text-slate-900">Favoritos</Link>
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {destaque.slice(0, 4).map(f => {
                const cor = corDoModulo(f.moduloId);
                return (
                  <Link key={f.id} href={`/biblioteca/${f.produtoSlug}/${f.slug}`} className={`${cartao} p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors`}>
                    <span className={`w-10 h-10 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center`}><CentralIcone nome={f.icone} size={18} /></span>
                    <span className="text-sm font-semibold leading-snug line-clamp-2">{f.nome}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Meus produtos (só os que a pessoa tem) + atalho para os kits */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className={rotulo}>Meus produtos</h2>
            {temKitsAVenda && <Link href="/biblioteca/explorar" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">Explorar outros kits <ArrowRight size={14} /></Link>}
          </div>
          {meus.length === 0 ? (
            <div className={`${cartao} p-6 text-center`}>
              <p className="font-semibold">Você ainda não tem nenhum kit liberado.</p>
              <Link href="/biblioteca/explorar" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">Explorar kits <ArrowRight size={15} /></Link>
            </div>
          ) : (
            <ul className={`${cartao} divide-y divide-slate-200/80`}>
              {meus.map(p => (
                <li key={p.slug}>
                  <Link href={`/biblioteca/${p.slug}`} className="group flex items-center gap-4 px-4 py-3.5">
                    <CapaProduto p={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug truncate">{p.nome}</span>
                      <span className="block text-xs text-slate-500">{p.ferramentas} {p.ferramentas === 1 ? "ferramenta" : "ferramentas"}</span>
                    </span>
                    <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
