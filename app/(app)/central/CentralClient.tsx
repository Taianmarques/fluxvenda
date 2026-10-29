"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search, Star, Building2, ArrowRight, Bookmark, X, ChevronRight, Sparkles, Wrench, LayoutGrid, Zap, Loader2, MousePointerClick,
} from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";
import type { FerramentaTelaDados } from "@/lib/central-dados";
import { FerramentaClient } from "./[slug]/FerramentaClient";

type FerramentaCard = { slug: string; nome: string; descricao: string; icone: string; ordem: number; criadaEm: string };
type Modulo = { id: string; numero: number; nome: string; descricao: string; icone: string; ferramentas: FerramentaCard[] };
type Item = FerramentaCard & { modulo: Modulo };

function normalizar(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Painel lateral (ferramenta aberta ao lado da lista) só em tela larga; abaixo disso abre a página
const MQ_PAINEL = "(min-width: 1280px)";

export function CentralClient({
  modulos, favoritosIniciais, perfilPct, perfilOk, primeiroNome, geracoesMes, salvos,
}: {
  modulos: Modulo[];
  favoritosIniciais: string[];
  perfilPct: number;
  perfilOk: boolean;
  primeiroNome: string;
  geracoesMes: number;
  salvos: number;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("todos"); // "todos" | "favoritos" | moduloId
  const [ordem, setOrdem] = useState<"padrao" | "az" | "recentes">("padrao");
  const [favoritos, setFavoritos] = useState(() => new Set(favoritosIniciais));
  const [aberta, setAberta] = useState<string | null>(null);
  const [painel, setPainel] = useState<FerramentaTelaDados | null>(null);
  const [carregandoPainel, setCarregandoPainel] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  const todas: Item[] = useMemo(() => modulos.flatMap(m => m.ferramentas.map(f => ({ ...f, modulo: m }))), [modulos]);
  const total = todas.length;
  const comFerramentas = modulos.filter(m => m.ferramentas.length > 0);

  function marcarFavorito(slug: string, fav: boolean) {
    setFavoritos(prev => {
      const n = new Set(prev);
      if (fav) n.add(slug); else n.delete(slug);
      return n;
    });
  }

  async function alternarFavorito(slug: string) {
    const fav = !favoritos.has(slug);
    marcarFavorito(slug, fav);
    if (painel?.ferramenta.slug === slug) setPainel(p => (p ? { ...p, favorito: fav } : p));
    const res = await fetch(`/api/central/ferramentas/${slug}/favorito`, { method: "POST" }).catch(() => null);
    if (!res?.ok) marcarFavorito(slug, !fav);
  }

  async function abrirNoPainel(slug: string) {
    setAberta(slug);
    setCarregandoPainel(true);
    try {
      const res = await fetch(`/api/central/ferramentas/${slug}`);
      if (res.ok) setPainel(await res.json());
    } finally {
      setCarregandoPainel(false);
    }
  }

  function fecharPainel() {
    setAberta(null);
    setPainel(null);
  }

  // Busca digitada no topo leva direto pra lista
  useEffect(() => {
    if (busca) listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [busca]);

  function escolherModulo(id: string) {
    setFiltro(id);
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    const lista = todas.filter(f =>
      (filtro === "todos" || (filtro === "favoritos" ? favoritos.has(f.slug) : f.modulo.id === filtro)) &&
      (!q || normalizar(`${f.nome} ${f.descricao} ${f.modulo.nome}`).includes(q)),
    );
    if (ordem === "az") return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (ordem === "recentes") return [...lista].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
    return lista;
  }, [todas, busca, filtro, favoritos, ordem]);

  const tituloLista = filtro === "todos" ? "Todas as ferramentas" : filtro === "favoritos" ? "Favoritas" : modulos.find(m => m.id === filtro)?.nome ?? "";
  const cartao = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

  const stats = [
    { valor: total, rotulo: "Ferramentas de IA", icone: <Wrench size={19} />, cor: "bg-indigo-50 text-indigo-600" },
    { valor: comFerramentas.length || modulos.length, rotulo: "Módulos comerciais", icone: <LayoutGrid size={19} />, cor: "bg-amber-50 text-amber-600" },
    { valor: geracoesMes, rotulo: "Gerações este mês", icone: <Zap size={19} />, cor: "bg-sky-50 text-sky-600" },
    { valor: salvos, rotulo: "Resultados salvos", icone: <Bookmark size={19} />, cor: "bg-violet-50 text-violet-600", href: "/central/salvos" },
  ];

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-6">
        {/* Busca + atalhos */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-2xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar ferramenta, tema ou problema..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
            {busca && (
              <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            )}
          </div>
          <Link href="/central/perfil" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
            <Building2 size={15} /> Meu negócio
          </Link>
          <Link href="/central/salvos" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
            <Bookmark size={15} /> Meus resultados
          </Link>
        </div>

        {/* Boas-vindas */}
        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-100 p-6 md:p-8">
          <div className="relative z-10 max-w-xl">
            <span className="inline-block rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Bem-vindo(a){primeiroNome ? `, ${primeiroNome}` : ""}!
            </span>
            <h1 className="mt-3 text-2xl md:text-[32px] font-bold leading-tight tracking-tight text-slate-900">
              Mais clientes, mais vendas, com o poder da inteligência artificial.
            </h1>
            <p className="mt-3 text-slate-600">
              Acesse {total > 0 ? `${total} ferramentas prontas` : "ferramentas prontas"} para atrair clientes, criar campanhas, melhorar o atendimento e vender mais.
            </p>
            <button
              onClick={() => listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25"
            >
              Explorar ferramentas <ArrowRight size={16} />
            </button>
          </div>
          {/* Ilustração: módulos flutuando em volta de um gráfico subindo */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[420px] h-[220px]" aria-hidden>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-end gap-3">
              {[38, 62, 84, 112, 148].map((h, i) => (
                <div key={i} className="w-9 rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400 opacity-90" style={{ height: h }} />
              ))}
            </div>
            {modulos.slice(0, 6).map((m, i) => {
              const pos = [
                "left-0 top-2", "left-6 top-[88px]", "left-0 top-[168px]", "right-0 top-0", "right-6 top-[80px]", "right-0 top-[160px]",
              ][i];
              const cor = corDoModulo(m.id);
              return (
                <div key={m.id} className={`absolute ${pos} flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-md shadow-indigo-900/5 border border-white`}>
                  <span className={`w-5 h-5 rounded-md ${cor.fundo} ${cor.icone} flex items-center justify-center`}><CentralIcone nome={m.icone} size={12} /></span>
                  {m.nome.split(" ")[0]}
                </div>
              );
            })}
          </div>
        </section>

        {/* Números */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => {
            const conteudo = (
              <>
                <div className={`w-11 h-11 rounded-xl ${s.cor} flex items-center justify-center flex-shrink-0`}>{s.icone}</div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums leading-none">{s.valor}</p>
                  <p className="text-sm text-slate-500 mt-1 truncate">{s.rotulo}</p>
                </div>
              </>
            );
            return s.href ? (
              <Link key={s.rotulo} href={s.href} className={`${cartao} p-4 flex items-center gap-3.5 hover:border-slate-300`}>{conteudo}</Link>
            ) : (
              <div key={s.rotulo} className={`${cartao} p-4 flex items-center gap-3.5`}>{conteudo}</div>
            );
          })}
        </div>

        {!perfilOk && (
          <Link href="/central/perfil" className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-300">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><Building2 size={19} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">Complete o perfil da sua empresa</p>
              <p className="text-sm text-slate-600">Preencha uma vez o que você vende e para quem — todas as ferramentas usam isso e as respostas ficam muito mais certeiras.</p>
            </div>
            <span className="hidden sm:block text-sm tabular-nums text-amber-800">{perfilPct}%</span>
            <ArrowRight size={16} className="text-amber-700 flex-shrink-0" />
          </Link>
        )}

        {/* Escolha seu desafio */}
        <section>
          <h2 className="text-xl font-bold">Escolha seu desafio</h2>
          <p className="text-sm text-slate-500 mt-0.5">Clique em uma área para ver as ferramentas relacionadas.</p>
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {modulos.map(m => {
              const cor = corDoModulo(m.id);
              const ativo = filtro === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => escolherModulo(m.id)}
                  className={`${cartao} p-4 text-center hover:border-slate-300 hover:-translate-y-0.5 transition-all ${ativo ? "!border-indigo-400 ring-2 ring-indigo-500/15" : ""}`}
                >
                  <div className={`w-11 h-11 mx-auto rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center`}>
                    <CentralIcone nome={m.icone} size={21} />
                  </div>
                  <p className="mt-2.5 text-sm font-semibold leading-snug">{m.nome}</p>
                  <p className="mt-1 text-xs text-slate-400">{m.ferramentas.length} {m.ferramentas.length === 1 ? "ferramenta" : "ferramentas"}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Biblioteca: módulos | ferramentas | painel */}
        <div ref={listaRef} className="scroll-mt-4 grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_400px]">
          <aside className={`${cartao} p-3 self-start hidden xl:block`}>
            <h3 className="px-2 pt-1 pb-2 font-semibold">Módulos</h3>
            <nav className="space-y-0.5 text-sm">
              {[
                { id: "todos", nome: "Todos os módulos", n: total },
                { id: "favoritos", nome: "Favoritas", n: favoritos.size },
                ...modulos.map(m => ({ id: m.id, nome: m.nome, n: m.ferramentas.length })),
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setFiltro(item.id)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left ${filtro === item.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {item.id === "favoritos" && <Star size={13} className="text-amber-400 fill-amber-400" />}{item.nome}
                  </span>
                  <span className={`text-xs tabular-nums rounded-md px-1.5 py-0.5 ${filtro === item.id ? "bg-indigo-100" : "bg-slate-100 text-slate-500"}`}>{item.n}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className={`${cartao} p-4 min-w-0`}>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h3 className="font-semibold text-lg">{tituloLista} <span className="text-slate-400 font-normal">({visiveis.length})</span></h3>
              <select
                value={ordem}
                onChange={e => setOrdem(e.target.value as typeof ordem)}
                aria-label="Ordenar"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="padrao">Ordem sugerida</option>
                <option value="az">A–Z</option>
                <option value="recentes">Mais recentes</option>
              </select>
            </div>
            {/* Filtro por módulo em telas menores (a coluna de módulos some) */}
            <div className="xl:hidden flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
              {[{ id: "todos", nome: "Todas" }, { id: "favoritos", nome: "Favoritas" }, ...comFerramentas.map(m => ({ id: m.id, nome: m.nome }))].map(c => (
                <button
                  key={c.id}
                  onClick={() => setFiltro(c.id)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm ${filtro === c.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {c.nome}
                </button>
              ))}
            </div>

            {visiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 text-sm">
                {total === 0
                  ? "As ferramentas estão sendo preparadas. Volte em breve!"
                  : filtro === "favoritos" && !busca
                    ? "Você ainda não favoritou nenhuma ferramenta. Toque na estrela para ela aparecer aqui."
                    : "Nenhuma ferramenta encontrada. Tente outra palavra."}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {visiveis.map(f => {
                  const cor = corDoModulo(f.modulo.id);
                  const fav = favoritos.has(f.slug);
                  const selecionada = aberta === f.slug;
                  return (
                    <li key={f.slug} className={`group relative flex items-center rounded-xl border transition-colors ${selecionada ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-500/10" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"}`}>
                      <Link
                        href={`/central/${f.slug}`}
                        onClick={e => {
                          if (window.matchMedia(MQ_PAINEL).matches) { e.preventDefault(); abrirNoPainel(f.slug); }
                        }}
                        className="flex flex-1 items-center gap-3.5 min-w-0 p-3.5 pr-20"
                      >
                        <div className={`w-12 h-12 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}>
                          <CentralIcone nome={f.icone} size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{f.nome}</p>
                          {f.descricao && <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{f.descricao}</p>}
                          <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cor.etiqueta}`}>{f.modulo.nome}</span>
                        </div>
                      </Link>
                      <div className="absolute right-3 flex items-center gap-1">
                        <button onClick={() => alternarFavorito(f.slug)} aria-label={fav ? "Remover dos favoritos" : "Favoritar"} aria-pressed={fav} className="p-1.5 rounded-lg hover:bg-white">
                          <Star size={18} className={fav ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-slate-500"} />
                        </button>
                        <ChevronRight size={17} className="text-slate-300" aria-hidden />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="hidden xl:block self-start sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl [scrollbar-width:thin]">
            {carregandoPainel && !painel ? (
              <div className={`${cartao} p-10 flex items-center justify-center text-slate-400`}><Loader2 className="animate-spin" /></div>
            ) : painel ? (
              <FerramentaClient key={painel.ferramenta.slug} dados={painel} modo="painel" onFechar={fecharPainel} onFavoritoChange={marcarFavorito} onAbrirRelacionada={abrirNoPainel} />
            ) : (
              <div className={`${cartao} p-6 text-center`}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><MousePointerClick size={22} /></div>
                <p className="mt-3 font-semibold">Escolha uma ferramenta</p>
                <p className="mt-1 text-sm text-slate-500">Ela abre aqui ao lado: você preenche, clica em <span className="inline-flex items-center gap-1 font-medium text-slate-700"><Sparkles size={13} />Gerar com IA</span> e recebe o resultado na hora.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
