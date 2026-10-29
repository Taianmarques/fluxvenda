"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Star, Sparkles, Loader2, Copy, Check, Bookmark, BookmarkCheck, RotateCcw, Building2, History, Trash2,
  ClipboardCopy, AlertTriangle, Maximize2, Lightbulb, Lock, ChevronRight,
} from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";
import type { FerramentaTelaDados, GeracaoTela } from "@/lib/central-dados";
import { Markdown, paraTextoPuro } from "../Markdown";

const ETAPAS = ["Analisando as informações do seu negócio...", "Aplicando a estratégia da ferramenta...", "Escrevendo o resultado...", "Revisando os detalhes..."];

function quando(iso: string) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "Gerado agora";
  if (min < 60) return `Há ${min} min`;
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `Hoje, ${hora}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${hora}`;
}

// Uma ferramenta da Central: formulário → "Gerar com IA" → resultado (versões em abas) com
// Copiar / Gerar novamente / Salvar. modo "pagina" = /central/<slug>, com histórico ao lado;
// modo "painel" = coluna direita da biblioteca, mais compacta.
// Resultado dividido nos blocos "## ..." que a IA devolve (cada mensagem, anúncio, roteiro...),
// cada um com o próprio Copiar — é o que a pessoa realmente leva pro WhatsApp/Instagram
function separarBlocos(texto: string) {
  const partes = texto.split(/\n(?=#{2,3}\s)/);
  const blocos = partes.map(p => {
    const m = p.match(/^#{2,3}\s+(.*)\n?([\s\S]*)$/);
    return m ? { titulo: m[1].replace(/\*\*/g, "").trim(), corpo: m[2].trim() } : { titulo: "", corpo: p.trim() };
  }).filter(b => b.titulo || b.corpo);
  return blocos;
}

function BlocoResultado({ titulo, corpo }: { titulo: string; corpo: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(paraTextoPuro(corpo));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900 min-w-0">{titulo}</p>
        <button onClick={copiar} className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 rounded-md px-2 py-1 hover:bg-slate-50">
          {copiado ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div className="px-4 py-3"><Markdown texto={corpo} /></div>
    </div>
  );
}

export function FerramentaClient({
  dados, modo, onFechar, onFavoritoChange, onAbrirRelacionada,
}: {
  dados: FerramentaTelaDados;
  modo: "pagina" | "painel";
  onFechar?: () => void;
  onFavoritoChange?: (slug: string, favorito: boolean) => void;
  onAbrirRelacionada?: (slug: string) => void; // no painel, relacionada abre no próprio painel
}) {
  const { ferramenta, perfilOk, nomeEmpresa } = dados;
  const cor = corDoModulo(ferramenta.modulo.id);
  const [valores, setValores] = useState<Record<string, string>>(() => {
    // Começa com o que a pessoa usou da última vez (costuma ser o mesmo produto/cliente); campo
    // ligado ao perfil da empresa vem preenchido com o perfil
    const ultima = dados.historico[0]?.entradas ?? {};
    return Object.fromEntries(ferramenta.campos.map(c => [c.key, ultima[c.key] || (c.perfil ? dados.perfilValores[c.perfil] ?? "" : "")]));
  });
  const [favorito, setFavorito] = useState(dados.favorito);
  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<GeracaoTela[]>(dados.historico);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"resultado" | "prompt" | null>(null);
  const [promptCopiado, setPromptCopiado] = useState(false); // mostra os atalhos pro ChatGPT/Claude
  const [uso, setUso] = useState(dados.uso);
  const [verComoUsar, setVerComoUsar] = useState(false);
  const bloqueada = !uso.permitido;

  const atual = historico.find(h => h.id === atualId) ?? null;
  const blocos = atual ? separarBlocos(atual.resultado) : [];
  // Abas de versões: as 3 gerações mais recentes (a 1ª aba é a mais antiga das três)
  const versoes = historico.slice(0, 3).reverse();

  useEffect(() => {
    if (!gerando) return;
    const t = setInterval(() => setEtapa(e => Math.min(e + 1, ETAPAS.length - 1)), 3500);
    return () => clearInterval(t);
  }, [gerando]);

  function faltando() {
    return ferramenta.campos.find(c => c.obrigatorio && !(valores[c.key] ?? "").trim());
  }

  function rolarProResultado() {
    requestAnimationFrame(() => document.getElementById(`resultado-${modo}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  async function gerar() {
    if (gerando) return;
    const f = faltando();
    if (f) { setErro(`Preencha "${f.label}".`); return; }
    setErro(null);
    setEtapa(0);
    setGerando(true);
    try {
      const res = await fetch(`/api/central/ferramentas/${ferramenta.slug}/gerar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entradas: valores }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.geracao) {
        setErro(data.error ?? "Não foi possível gerar agora. Tente de novo.");
        if (res.status === 429) setUso(u => ({ ...u, permitido: false, motivo: data.error ?? u.motivo }));
        return;
      }
      if (typeof data.usosHoje === "number" && uso.limite) {
        setUso(u => ({ ...u, usosHoje: data.usosHoje, permitido: data.usosHoje < (u.limite ?? Infinity), motivo: data.usosHoje >= (u.limite ?? Infinity) ? "Você atingiu o limite diário desta ferramenta. Volte amanhã!" : null }));
      }
      const g: GeracaoTela = { ...data.geracao, createdAt: new Date(data.geracao.createdAt).toISOString() };
      setHistorico(prev => [g, ...prev].slice(0, 30));
      setAtualId(g.id);
      rolarProResultado();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function copiarResultado() {
    if (!atual) return;
    await navigator.clipboard.writeText(paraTextoPuro(atual.resultado));
    setCopiado("resultado");
    setTimeout(() => setCopiado(null), 2000);
  }

  async function copiarPrompt() {
    const f = faltando();
    if (f) { setErro(`Preencha "${f.label}" antes de copiar o prompt.`); return; }
    const res = await fetch(`/api/central/ferramentas/${ferramenta.slug}/prompt`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entradas: valores }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.prompt) { setErro(data?.error ?? "Não foi possível copiar o prompt."); return; }
    await navigator.clipboard.writeText(data.prompt);
    setPromptCopiado(true);
    setCopiado("prompt");
    setTimeout(() => setCopiado(null), 2500);
  }

  async function alternarSalvo(g: GeracaoTela) {
    const salvo = !g.salvo;
    setHistorico(prev => prev.map(h => h.id === g.id ? { ...h, salvo } : h));
    const res = await fetch(`/api/central/geracoes/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salvo }),
    }).catch(() => null);
    if (!res?.ok) setHistorico(prev => prev.map(h => h.id === g.id ? { ...h, salvo: !salvo } : h));
  }

  async function apagar(g: GeracaoTela) {
    if (!confirm("Apagar este resultado do histórico?")) return;
    setHistorico(prev => prev.filter(h => h.id !== g.id));
    if (atualId === g.id) setAtualId(null);
    await fetch(`/api/central/geracoes/${g.id}`, { method: "DELETE" }).catch(() => null);
  }

  async function alternarFavorito() {
    const novo = !favorito;
    setFavorito(novo);
    onFavoritoChange?.(ferramenta.slug, novo);
    const res = await fetch(`/api/central/ferramentas/${ferramenta.slug}/favorito`, { method: "POST" }).catch(() => null);
    if (!res?.ok) { setFavorito(!novo); onFavoritoChange?.(ferramenta.slug, !novo); }
  }

  function abrirDoHistorico(g: GeracaoTela) {
    setAtualId(g.id);
    setValores(Object.fromEntries(ferramenta.campos.map(c => [c.key, g.entradas[c.key] ?? ""])));
    rolarProResultado();
  }

  const inputCls = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-60";
  const painel = modo === "painel";
  const cartao = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

  const cabecalho = (
    <div className={`${cartao} p-5`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        {painel ? (
          <button onClick={onFechar} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={15} /> Voltar para a biblioteca
          </button>
        ) : (
          <Link href="/central" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={15} /> Voltar para a biblioteca
          </Link>
        )}
        <div className="flex items-center gap-1">
          {painel && (
            <Link href={`/central/${ferramenta.slug}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Abrir em tela cheia" aria-label="Abrir em tela cheia">
              <Maximize2 size={15} />
            </Link>
          )}
          <button onClick={alternarFavorito} aria-pressed={favorito} aria-label={favorito ? "Remover dos favoritos" : "Favoritar"} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Star size={18} className={favorito ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-slate-500"} />
          </button>
        </div>
      </div>
      <div className="flex items-start gap-3.5">
        <div className={`w-12 h-12 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}>
          <CentralIcone nome={ferramenta.icone} size={22} />
        </div>
        <div className="min-w-0">
          <h1 className={`${painel ? "text-lg" : "text-2xl"} font-bold leading-tight text-slate-900`}>{ferramenta.nome}</h1>
          {ferramenta.descricao && <p className="text-sm text-slate-500 mt-1">{ferramenta.descricao}</p>}
          <span className={`inline-block mt-2.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cor.etiqueta}`}>{ferramenta.modulo.nome}</span>
        </div>
      </div>
      {(ferramenta.formatoResposta || ferramenta.objetivo) && (
        <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5">
          <span className="font-medium text-slate-800">Você recebe: </span>
          {ferramenta.formatoResposta || ferramenta.objetivo.replace(/^Você recebe:\s*/i, "")}
        </p>
      )}
      {ferramenta.comoUsar && (
        <div className="mt-2">
          <button onClick={() => setVerComoUsar(v => !v)} aria-expanded={verComoUsar} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800">
            <Lightbulb size={14} /> {verComoUsar ? "Esconder dicas de uso" : "Como usar esta ferramenta"}
          </button>
          {verComoUsar && <p className="mt-2 text-sm text-slate-600 bg-indigo-50/60 rounded-xl px-3.5 py-2.5">{ferramenta.comoUsar}</p>}
        </div>
      )}
    </div>
  );

  const formulario = (
    <section className={`${cartao} p-5 space-y-3.5`}>
      <h2 className="font-semibold text-slate-900">Suas informações</h2>
      <Link
        href="/central/perfil"
        className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${perfilOk ? "bg-slate-50 text-slate-500 hover:text-slate-800" : "bg-amber-50 text-amber-800 hover:text-amber-900"}`}
      >
        {perfilOk ? <Building2 size={14} className="flex-shrink-0" /> : <AlertTriangle size={14} className="flex-shrink-0" />}
        <span className="min-w-0">
          {perfilOk
            ? <>Usando o perfil de <strong className="font-medium text-slate-700">{nomeEmpresa || "sua empresa"}</strong> · editar</>
            : "Complete o perfil da sua empresa para respostas mais certeiras →"}
        </span>
      </Link>

      {ferramenta.campos.map(c => (
        <div key={c.key} className="space-y-1.5">
          <label htmlFor={`${modo}-campo-${c.key}`} className="text-sm text-slate-700">
            {c.label}{!c.obrigatorio && <span className="text-slate-400"> (opcional)</span>}
            {c.perfil && (valores[c.key] ?? "") === (dados.perfilValores[c.perfil] ?? "") && valores[c.key] && (
              <span className="ml-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">do seu perfil</span>
            )}
          </label>
          {c.tipo === "textarea" ? (
            <textarea
              id={`${modo}-campo-${c.key}`} value={valores[c.key] ?? ""} onChange={e => setValores(v => ({ ...v, [c.key]: e.target.value }))}
              rows={3} maxLength={c.maxCaracteres ?? 3000} placeholder={c.placeholder} disabled={gerando} className={`${inputCls} resize-y`}
            />
          ) : c.tipo === "select" ? (
            <select
              id={`${modo}-campo-${c.key}`} value={valores[c.key] ?? ""} onChange={e => setValores(v => ({ ...v, [c.key]: e.target.value }))}
              disabled={gerando} className={inputCls}
            >
              <option value="">Selecione...</option>
              {(c.opcoes ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              id={`${modo}-campo-${c.key}`} type={c.tipo === "numero" ? "number" : "text"} min={c.min} max={c.max} value={valores[c.key] ?? ""}
              onChange={e => setValores(v => ({ ...v, [c.key]: e.target.value }))}
              maxLength={c.maxCaracteres ?? 3000} placeholder={c.placeholder} disabled={gerando} className={inputCls}
            />
          )}
          {c.ajuda && <p className="text-xs text-slate-400">{c.ajuda}</p>}
        </div>
      ))}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {bloqueada && uso.motivo && (
        <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-xl px-3.5 py-2.5"><Lock size={15} className="mt-0.5 flex-shrink-0" /> {uso.motivo}</p>
      )}
      <button
        onClick={gerar}
        disabled={gerando || bloqueada}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-semibold shadow-sm shadow-indigo-600/20 disabled:opacity-60"
      >
        {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {gerando ? ETAPAS[etapa] : atual ? "Gerar outra versão" : "Gerar com IA"}
      </button>
      {uso.limite != null && (
        <p className="text-center text-xs text-slate-400 tabular-nums">{uso.usosHoje} de {uso.limite} usos hoje</p>
      )}
      {ferramenta.permitirCopiarPrompt && (
        <div className="space-y-2">
          <button
            onClick={copiarPrompt}
            disabled={gerando}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-60"
            title="Copia o prompt completo, já preenchido com os seus dados, para colar no seu ChatGPT ou Claude"
          >
            {copiado === "prompt" ? <Check size={15} className="text-emerald-600" /> : <ClipboardCopy size={15} />}
            {copiado === "prompt" ? "Prompt copiado!" : "Copiar prompt para o ChatGPT ou Claude"}
          </button>
          {promptCopiado && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-sm text-slate-600 space-y-2">
              <p>O prompt completo (com os dados da sua empresa) está copiado. Abra a sua IA e cole com <strong className="text-slate-800">Ctrl+V</strong>:</p>
              <div className="flex gap-2">
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="flex-1 text-center rounded-lg bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 font-medium text-slate-800">Abrir ChatGPT</a>
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="flex-1 text-center rounded-lg bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 font-medium text-slate-800">Abrir Claude</a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );

  const acaoCls = "flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-sm text-slate-700 disabled:opacity-50";
  const resultado = atual && (
    <section id={`resultado-${modo}`} className={`${cartao} p-5 scroll-mt-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-slate-900">Resultado gerado pela IA</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden /> {quando(atual.createdAt)}
        </span>
      </div>
      {versoes.length > 1 && (
        <div className="flex border-b border-slate-200 mb-3" role="tablist">
          {versoes.map((v, i) => (
            <button
              key={v.id} role="tab" aria-selected={v.id === atual.id} onClick={() => setAtualId(v.id)}
              className={`flex-1 -mb-px border-b-2 px-2 py-2 text-sm ${v.id === atual.id ? "border-indigo-600 text-indigo-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Versão {i + 1}
            </button>
          ))}
        </div>
      )}
      {blocos.length >= 2 ? (
        <div className={`space-y-2.5 rounded-xl bg-slate-50 p-2.5 ${painel ? "max-h-[520px] overflow-y-auto" : ""}`}>
          {blocos.map((b, i) => b.titulo
            ? <BlocoResultado key={`${atual.id}-${i}`} titulo={b.titulo} corpo={b.corpo} />
            : <div key={`${atual.id}-${i}`} className="px-2 py-1"><Markdown texto={b.corpo} /></div>)}
        </div>
      ) : (
        <div className={`rounded-xl bg-slate-50 p-4 ${painel ? "max-h-[420px] overflow-y-auto" : ""}`}>
          <Markdown texto={atual.resultado} />
        </div>
      )}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button onClick={copiarResultado} className={acaoCls}>
          {copiado === "resultado" ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} {copiado === "resultado" ? "Copiado" : "Copiar texto"}
        </button>
        <button onClick={gerar} disabled={gerando || bloqueada} className={acaoCls}>
          <RotateCcw size={15} /> Gerar novamente
        </button>
        <button onClick={() => alternarSalvo(atual)} className={acaoCls}>
          {atual.salvo ? <BookmarkCheck size={15} className="text-indigo-600" /> : <Bookmark size={15} />} {atual.salvo ? "Salvo" : "Salvar"}
        </button>
      </div>
    </section>
  );

  const relacionadas = dados.relacionadas.length > 0 && (
    <section className={`${cartao} p-5`}>
      <h2 className="font-semibold text-slate-900 mb-3">Ferramentas relacionadas</h2>
      <ul className="space-y-2">
        {dados.relacionadas.map(r => {
          const c = corDoModulo(r.moduloId);
          const conteudo = (
            <>
              <span className={`w-9 h-9 rounded-lg ${c.fundo} ${c.icone} flex items-center justify-center flex-shrink-0`}><CentralIcone nome={r.icone} size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{r.nome}</span>
                {r.descricao && <span className="block text-xs text-slate-500 line-clamp-1">{r.descricao}</span>}
              </span>
              <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
            </>
          );
          const cls = "flex w-full items-center gap-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 py-2.5 text-left";
          return (
            <li key={r.slug}>
              {onAbrirRelacionada
                ? <button onClick={() => onAbrirRelacionada(r.slug)} className={cls}>{conteudo}</button>
                : <Link href={`/central/${r.slug}`} className={cls}>{conteudo}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );

  if (painel) {
    return (
      <div className="space-y-4">
        {cabecalho}
        {formulario}
        {resultado}
        {relacionadas}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5 min-w-0">
        {cabecalho}
        {formulario}
        {resultado}
        {relacionadas}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-4 self-start">
        <h2 className="text-sm font-medium text-slate-500 flex items-center gap-1.5"><History size={14} /> Seu histórico nesta ferramenta</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-300 p-4">Os resultados que você gerar ficam aqui para consultar depois.</p>
        ) : (
          <ul className="space-y-2">
            {historico.map(h => (
              <li key={h.id}>
                <div className={`rounded-xl border px-3 py-2.5 transition-colors ${h.id === atualId ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <button onClick={() => abrirDoHistorico(h)} className="block w-full text-left">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      {quando(h.createdAt)} {h.salvo && <BookmarkCheck size={12} className="text-indigo-600" />}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">{h.resultado.replace(/[#*]/g, "").slice(0, 160)}</p>
                  </button>
                  <div className="flex justify-end">
                    <button onClick={() => apagar(h)} aria-label="Apagar do histórico" className="text-slate-300 hover:text-red-500 p-1 -mb-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
