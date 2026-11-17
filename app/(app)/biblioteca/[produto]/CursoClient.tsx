"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Copy, PlayCircle, Terminal, Video,
} from "lucide-react";
import type { AulaCurso, ComandoCurso, ModuloCurso } from "@/lib/curso";

// Área do curso (produtos no formato "curso"): player da aula, aulas por módulo com progresso,
// "marcar como concluída" e os comandos prontos do módulo para copiar e colar no ChatGPT ou no
// Claude. A aula aberta fica na URL (?aula=) para o aluno voltar direto nela.

const cartao = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type AulaComModulo = AulaCurso & { modulo: ModuloCurso; indice: number };

function duracao(min: number | null) {
  return min ? `${min} min` : null;
}

function Player({ aula }: { aula: AulaCurso }) {
  const v = aula.video;
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
      {v?.tipo === "iframe" ? (
        <iframe key={v.src} src={v.src} title={aula.titulo} allow="autoplay; fullscreen; picture-in-picture; clipboard-write" allowFullScreen className="absolute inset-0 h-full w-full" />
      ) : v?.tipo === "arquivo" ? (
        <video key={v.src} src={v.src} controls playsInline className="absolute inset-0 h-full w-full bg-black" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-slate-300 p-6">
          <Video size={34} className="text-slate-500" />
          <p className="font-semibold text-white">O vídeo desta aula está a caminho</p>
          <p className="text-sm text-slate-400">Enquanto isso, confira o resumo e os comandos do módulo logo abaixo.</p>
        </div>
      )}
    </div>
  );
}

function ComandoCard({ c }: { c: ComandoCurso }) {
  const [copiado, setCopiado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const longo = c.texto.length > 280;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(c.texto);
    } catch {
      // Navegadores sem acesso à área de transferência: seleciona o texto num campo temporário
      const t = document.createElement("textarea");
      t.value = c.texto;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className={`${cartao} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{c.titulo}</p>
          {c.descricao && <p className="mt-0.5 text-sm text-slate-500">{c.descricao}</p>}
        </div>
        <button
          onClick={copiar}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${copiado ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
        >
          {copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
        </button>
      </div>
      <div className="relative mt-3">
        <pre className={`whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-slate-200 p-3 font-mono text-[12.5px] leading-relaxed text-slate-700 ${longo && !aberto ? "max-h-32 overflow-hidden" : ""}`}>{c.texto}</pre>
        {longo && !aberto && <div aria-hidden className="pointer-events-none absolute inset-x-px bottom-px h-12 rounded-b-xl bg-gradient-to-t from-slate-50 to-transparent" />}
      </div>
      {longo && (
        <button onClick={() => setAberto(v => !v)} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
          {aberto ? "Mostrar menos" : "Ver comando completo"}
        </button>
      )}
    </div>
  );
}

function ListaComandos({ comandos }: { comandos: ComandoCurso[] }) {
  return <div className="space-y-3">{comandos.map(c => <ComandoCard key={c.id} c={c} />)}</div>;
}

export function CursoClient({ produto, modulos, concluidasIniciais, aulaInicial }: {
  produto: { nome: string; beneficio: string };
  modulos: ModuloCurso[];
  concluidasIniciais: string[];
  aulaInicial: string | null;
}) {
  const aulas: AulaComModulo[] = useMemo(
    () => modulos.flatMap(m => m.aulas.map(a => ({ ...a, modulo: m }))).map((a, indice) => ({ ...a, indice })),
    [modulos],
  );
  const totalComandos = modulos.reduce((s, m) => s + m.comandos.length, 0);
  const [concluidas, setConcluidas] = useState(() => new Set(concluidasIniciais));
  const [vista, setVista] = useState<"aula" | "comandos">(aulas.length ? "aula" : "comandos");
  const [atualId, setAtualId] = useState<string | null>(() => {
    if (aulaInicial && aulas.some(a => a.id === aulaInicial)) return aulaInicial;
    return (aulas.find(a => !concluidasIniciais.includes(a.id)) ?? aulas[0])?.id ?? null;
  });
  const [salvando, setSalvando] = useState(false);
  const topoRef = useRef<HTMLDivElement>(null);

  const atual = aulas.find(a => a.id === atualId) ?? null;
  const anterior = atual ? aulas[atual.indice - 1] : undefined;
  const proxima = atual ? aulas[atual.indice + 1] : undefined;
  const feitas = aulas.filter(a => concluidas.has(a.id)).length;
  const pct = aulas.length ? Math.round((feitas / aulas.length) * 100) : 0;
  const pendente = aulas.find(a => !concluidas.has(a.id));

  function abrir(id: string) {
    setAtualId(id);
    setVista("aula");
    window.history.replaceState(null, "", `?aula=${id}`);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function alternarConcluida() {
    if (!atual || salvando) return;
    const nova = !concluidas.has(atual.id);
    const aplicar = (v: boolean) => setConcluidas(prev => {
      const n = new Set(prev);
      if (v) n.add(atual.id); else n.delete(atual.id);
      return n;
    });
    aplicar(nova);
    setSalvando(true);
    const res = await fetch(`/api/central/aulas/${atual.id}/concluir`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concluida: nova }),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) aplicar(!nova);
  }

  const concluidaAtual = atual ? concluidas.has(atual.id) : false;

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        <Link href="/biblioteca" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Minha Biblioteca
        </Link>

        {/* Cabeçalho: produto e progresso */}
        <section className={`${cartao} p-5 md:p-6`}>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0">
              <span className="inline-block rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">{produto.nome}</span>
              <h1 className="mt-2.5 text-xl md:text-2xl font-bold leading-tight tracking-tight">{produto.beneficio || produto.nome}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendente && pendente.id !== atualId && (
                <button onClick={() => abrir(pendente.id)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25">
                  <PlayCircle size={16} /> Continuar de onde parei
                </button>
              )}
              {totalComandos > 0 && (
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
                  {aulas.length > 0 && (
                    <button onClick={() => setVista("aula")} className={`rounded-lg px-3 py-1.5 font-medium ${vista === "aula" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>Aulas</button>
                  )}
                  <button onClick={() => setVista("comandos")} className={`rounded-lg px-3 py-1.5 font-medium ${vista === "comandos" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>Comandos prontos ({totalComandos})</button>
                </div>
              )}
            </div>
          </div>
          {aulas.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600"><strong className="text-slate-900">{feitas}</strong> de {aulas.length} aulas concluídas</span>
                <span className="font-semibold tabular-nums text-indigo-700">{pct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </section>

        <div ref={topoRef} className="scroll-mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Principal */}
          <main className="min-w-0 space-y-5">
            {vista === "aula" && atual ? (
              <>
                <Player aula={atual} />
                <section className={`${cartao} p-5`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Módulo {atual.modulo.numero} · {atual.modulo.nome}</p>
                  <h2 className="mt-1.5 text-xl font-bold leading-snug">{atual.titulo}</h2>
                  {duracao(atual.duracaoMin) && <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500"><Clock size={14} /> {duracao(atual.duracaoMin)}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={alternarConcluida}
                      disabled={salvando}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${concluidaAtual ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
                    >
                      {concluidaAtual ? <><CheckCircle2 size={16} /> Aula concluída</> : <><Check size={16} /> Marcar como concluída</>}
                    </button>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <button onClick={() => anterior && abrir(anterior.id)} disabled={!anterior} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                        <ChevronLeft size={16} /> Anterior
                      </button>
                      <button onClick={() => proxima && abrir(proxima.id)} disabled={!proxima} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-40 ${concluidaAtual && proxima ? "bg-indigo-600 text-white hover:bg-indigo-500" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                        Próxima aula <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  {atual.descricao && <p className="mt-5 pt-5 border-t border-slate-100 text-slate-600 leading-relaxed whitespace-pre-line">{atual.descricao}</p>}
                </section>

                {atual.modulo.comandos.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 font-bold"><Terminal size={17} className="text-indigo-600" /> Comandos deste módulo</h3>
                    <p className="mt-0.5 mb-3 text-sm text-slate-500">Copie e cole no ChatGPT ou no Claude com a sua conta do Meta Ads conectada.</p>
                    <ListaComandos comandos={atual.modulo.comandos} />
                  </section>
                )}
              </>
            ) : (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Comandos prontos</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Copie e cole no ChatGPT ou no Claude com a sua conta do Meta Ads conectada.</p>
                </div>
                {totalComandos === 0 && <p className={`${cartao} p-5 text-sm text-slate-500`}>Os comandos deste curso estão sendo preparados.</p>}
                {modulos.filter(m => m.comandos.length > 0).map(m => (
                  <div key={m.id}>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">Módulo {m.numero} · {m.nome}</p>
                    <ListaComandos comandos={m.comandos} />
                  </div>
                ))}
              </section>
            )}
          </main>

          {/* Lista de módulos e aulas */}
          <aside className={`${cartao} self-start lg:sticky lg:top-4 overflow-hidden`}>
            <p className="px-4 py-3 border-b border-slate-100 font-semibold">Conteúdo do curso</p>
            {aulas.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">As aulas estão sendo preparadas.</p>}
            <nav className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {modulos.filter(m => m.aulas.length > 0).map(m => {
                const feitasModulo = m.aulas.filter(a => concluidas.has(a.id)).length;
                return (
                  <div key={m.id} className="py-2">
                    <div className="flex items-baseline justify-between gap-2 px-4 pt-1 pb-1.5">
                      <p className="text-sm font-semibold leading-snug"><span className="text-indigo-600">{m.numero}.</span> {m.nome}</p>
                      <span className="flex-shrink-0 text-xs tabular-nums text-slate-400">{feitasModulo}/{m.aulas.length}</span>
                    </div>
                    <ul>
                      {m.aulas.map(a => {
                        const ativa = vista === "aula" && a.id === atualId;
                        const feita = concluidas.has(a.id);
                        return (
                          <li key={a.id}>
                            <button
                              onClick={() => abrir(a.id)}
                              aria-current={ativa ? "true" : undefined}
                              className={`w-full flex items-start gap-2.5 px-4 py-2 text-left text-sm ${ativa ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}
                            >
                              {feita
                                ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                                : ativa ? <PlayCircle size={16} className="mt-0.5 flex-shrink-0 text-indigo-600" /> : <Circle size={16} className="mt-0.5 flex-shrink-0 text-slate-300" />}
                              <span className="min-w-0 flex-1 leading-snug">{a.titulo}</span>
                              {duracao(a.duracaoMin) && <span className="flex-shrink-0 text-xs text-slate-400">{duracao(a.duracaoMin)}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
            {aulas.length > 0 && proxima === undefined && feitas === aulas.length && (
              <p className="px-4 py-3 border-t border-slate-100 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 size={16} /> Você concluiu o curso!</p>
            )}
            {aulas.length > 0 && feitas < aulas.length && pendente && vista !== "aula" && (
              <button onClick={() => abrir(pendente.id)} className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 inline-flex items-center gap-1.5">
                Voltar para as aulas <ArrowRight size={15} />
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
