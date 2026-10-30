"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, Bot, Box, ChevronRight, ExternalLink, MessageSquareText, Rocket, Search, Sparkles, TrendingUp, Wrench, X,
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

function preco(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Tons dos blocos de "Próximos passos" (um por posição)
const TONS_PASSO = [
  { card: "bg-blue-50 hover:bg-blue-100/70", icone: "text-blue-600 bg-white", titulo: "text-slate-900" },
  { card: "bg-violet-50 hover:bg-violet-100/70", icone: "text-violet-600 bg-white", titulo: "text-violet-700" },
  { card: "bg-emerald-50 hover:bg-emerald-100/70", icone: "text-emerald-600 bg-white", titulo: "text-emerald-700" },
];

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

function CapaProduto({ p, tamanho }: { p: ProdutoInicio; tamanho: "md" | "lg" }) {
  const dim = tamanho === "lg" ? "w-28 h-28" : "w-20 h-20";
  return p.capaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.capaUrl} alt="" className={`${dim} rounded-xl object-cover flex-shrink-0 shadow-sm`} />
  ) : (
    <span className={`${dim} rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/20`}>
      <CentralIcone nome={p.icone} size={tamanho === "lg" ? 40 : 32} />
    </span>
  );
}

export function InicioClient({
  nome, empresa, produtos, ferramentas, destaque, passos, numeros,
}: {
  nome: string; empresa: string;
  produtos: ProdutoInicio[]; ferramentas: FerramentaInicio[]; destaque: FerramentaInicio[]; passos: PassoInicio[];
  numeros: Numeros;
}) {
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  const meus = produtos.filter(p => p.liberado);
  const disponiveis = produtos.filter(p => !p.liberado);
  // "Meus produtos" mostra 3 cartões; se a pessoa tem menos, completa com kits disponíveis
  const vitrineTopo = [...meus, ...disponiveis].slice(0, 3);
  const outrosKits = disponiveis.filter(p => !vitrineTopo.includes(p));
  const explorarHref = meus.length === 1 ? `/biblioteca/${meus[0].slug}` : meus.length ? "/biblioteca" : "/biblioteca/explorar";

  const stats = [
    { rotulo: "Produtos adquiridos", valor: numeros.produtos, sub: disponiveis.length ? `${disponiveis.length} ${disponiveis.length === 1 ? "kit disponível" : "kits disponíveis"} para ampliar` : "todos os kits liberados", icone: Box, cor: "bg-violet-100 text-violet-600", fundo: "from-violet-50/70" },
    { rotulo: "Ferramentas disponíveis", valor: numeros.ferramentas, sub: `em ${numeros.modulos} ${numeros.modulos === 1 ? "módulo" : "módulos"}`, icone: Wrench, cor: "bg-blue-100 text-blue-600", fundo: "from-blue-50/70" },
    { rotulo: "Prompts salvos", valor: numeros.salvos, sub: "seus prompts favoritos", icone: MessageSquareText, cor: "bg-emerald-100 text-emerald-600", fundo: "from-emerald-50/70" },
    { rotulo: "Prompts preparados", valor: numeros.preparados, sub: numeros.preparadosMes ? `${numeros.preparadosMes} este mês` : "prepare o primeiro hoje", icone: TrendingUp, cor: "bg-orange-100 text-orange-600", fundo: "from-orange-50/70", tendencia: numeros.preparadosMes > 0 },
  ];

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      {/* Topo: busca + usuário */}
      <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
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

      <div className="max-w-[1400px] mx-auto p-4 md:px-8 md:py-6 space-y-7">
        {/* Boas-vindas */}
        <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-violet-100 p-6 md:p-9">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 w-96 h-96 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] items-center">
            <div>
              {primeiroNome && <p className="text-sm font-medium text-blue-700 mb-2">Olá, {primeiroNome}!</p>}
              <h1 className="text-3xl md:text-[2.6rem] font-extrabold leading-tight tracking-tight">
                Bem-vindo à sua<br />central de <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">vendas com IA</span>
              </h1>
              <p className="mt-3 text-slate-600 md:text-lg max-w-2xl">Acesse seus produtos, personalize prompts e use o ChatGPT ou o Claude para vender mais.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={explorarHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25">
                  <Rocket size={17} /> Explorar ferramentas
                </Link>
                <Link href="/biblioteca" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
                  <BookOpen size={17} /> Ver minha biblioteca
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <div aria-hidden className="relative w-40 h-40 rounded-full bg-gradient-to-br from-white to-blue-100 border border-white shadow-xl shadow-blue-200/60 flex items-center justify-center">
                <Bot size={76} className="text-blue-600" strokeWidth={1.5} />
                <span className="absolute -top-1 right-3 w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md"><Sparkles size={17} /></span>
              </div>
              <div className="space-y-2.5">
                <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/90 hover:bg-white border border-white px-4 py-3 shadow-sm w-52">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><MessageSquareText size={19} /></span>
                  <span className="text-sm leading-tight"><span className="text-slate-500">Execute</span><br /><span className="font-semibold">no ChatGPT</span></span>
                  <ExternalLink size={13} className="ml-auto text-slate-400" />
                </a>
                <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/90 hover:bg-white border border-white px-4 py-3 shadow-sm w-52">
                  <span className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center"><Sparkles size={19} /></span>
                  <span className="text-sm leading-tight"><span className="text-slate-500">Ou</span><br /><span className="font-semibold">no Claude</span></span>
                  <ExternalLink size={13} className="ml-auto text-slate-400" />
                </a>
                <p className="text-xs text-blue-700/80 w-52 leading-snug">Os prompts são personalizados aqui e executados na sua IA de preferência.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Números */}
        <section className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          {stats.map(s => (
            <div key={s.rotulo} className={`${cartao} bg-gradient-to-br ${s.fundo} to-white p-4 md:p-5 flex items-start gap-4`}>
              <span className={`hidden sm:flex w-12 h-12 rounded-2xl ${s.cor} items-center justify-center flex-shrink-0`}><s.icone size={22} /></span>
              <div className="min-w-0">
                <p className="text-sm text-slate-600">{s.rotulo}</p>
                <p className="mt-0.5 text-3xl font-bold tabular-nums">{s.valor}</p>
                <p className={`mt-0.5 text-xs ${s.tendencia ? "text-emerald-700" : "text-slate-500"}`}>{s.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Meus produtos */}
        {vitrineTopo.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Meus produtos</h2>
              <Link href="/biblioteca" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:gap-1.5 transition-all">Ver todos <ArrowRight size={15} /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vitrineTopo.map(p => (
                <div key={p.slug} className={`${cartao} p-4 flex gap-4`}>
                  <CapaProduto p={p} tamanho="md" />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold leading-snug flex-1">{p.nome}</h3>
                      <span className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${p.liberado ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{p.liberado ? "Adquirido" : "Disponível"}</span>
                    </div>
                    {p.descricao && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.descricao}</p>}
                    <Link
                      href={`/biblioteca/${p.slug}`}
                      className="mt-auto pt-3 inline-flex"
                    >
                      <span className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        {p.liberado ? <><ExternalLink size={15} /> Acessar produto</> : <><Search size={15} /> Conhecer produto</>}
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className={`grid gap-7 ${outrosKits.length ? "xl:grid-cols-[1fr_380px]" : ""}`}>
          <div className="space-y-7 min-w-0">
            {/* Próximos passos */}
            {passos.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-3">Próximos passos recomendados</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  {passos.map((p, i) => {
                    const tom = TONS_PASSO[i % TONS_PASSO.length];
                    return (
                      <Link key={p.href} href={p.href} className={`group rounded-2xl ${tom.card} p-4 flex items-center gap-3.5 transition-colors`}>
                        <span className={`w-12 h-12 rounded-xl ${tom.icone} flex items-center justify-center flex-shrink-0 shadow-sm`}><CentralIcone nome={p.icone} size={22} /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block font-semibold ${tom.titulo} leading-snug`}>{p.titulo}</span>
                          {p.descricao && <span className="block mt-0.5 text-sm text-slate-600 line-clamp-2">{p.descricao}</span>}
                        </span>
                        <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Ferramentas em destaque */}
            {destaque.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold">Ferramentas em destaque</h2>
                  <Link href="/biblioteca" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:gap-1.5 transition-all">Ver todas <ArrowRight size={15} /></Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {destaque.map(f => {
                    const cor = corDoModulo(f.moduloId);
                    const href = `/biblioteca/${f.produtoSlug}/${f.slug}`;
                    return (
                      <div key={f.id} className={`${cartao} p-4 flex flex-col`}>
                        <Link href={href} className="group flex items-start gap-3">
                          <span className={`w-11 h-11 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}><CentralIcone nome={f.icone} size={20} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug">{f.nome}</span>
                            {f.descricao && <span className="block mt-0.5 text-xs text-slate-500 line-clamp-2">{f.descricao}</span>}
                          </span>
                          <ChevronRight size={17} className="text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5" />
                        </Link>
                        <Link href={href} className="mt-3 ml-14 self-start rounded-lg border border-blue-100 bg-blue-50/60 hover:bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
                          Usar ferramenta
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {meus.length === 0 && (
              <section className={`${cartao} p-8 text-center`}>
                <p className="font-semibold">Você ainda não tem nenhum kit liberado.</p>
                <p className="mt-1 text-sm text-slate-500">Conheça os kits disponíveis e comece a preparar prompts profissionais para o seu negócio.</p>
                <Link href="/biblioteca/explorar" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Explorar kits <ArrowRight size={16} /></Link>
              </section>
            )}
          </div>

          {/* Explorar outros kits */}
          {outrosKits.length > 0 && (
            <aside>
              <h2 className="text-xl font-bold">Explorar outros kits</h2>
              <p className="text-sm text-slate-500 mt-0.5 mb-3">Amplie seus resultados com novos produtos e ferramentas para o seu negócio.</p>
              <div className="space-y-3">
                {outrosKits.slice(0, 4).map(p => (
                  <div key={p.slug} className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 p-4 flex gap-4">
                    <CapaProduto p={p} tamanho="lg" />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h3 className="font-bold text-lg leading-snug text-indigo-900">{p.nome}</h3>
                      {p.descricao && <p className="mt-1 text-sm text-slate-600 line-clamp-3">{p.descricao}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                        {p.precoCentavos != null
                          ? <span className="text-lg font-bold text-indigo-900 tabular-nums">{preco(p.precoCentavos)}</span>
                          : <span className="text-sm text-slate-400">Em breve</span>}
                        <Link href={`/biblioteca/${p.slug}`} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white">
                          Ver detalhes <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {outrosKits.length > 4 && (
                  <Link href="/biblioteca/explorar" className="block text-center text-sm font-medium text-blue-600 hover:underline">Ver todos os kits</Link>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
