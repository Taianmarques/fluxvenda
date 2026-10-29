"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Star, Loader2, Copy, Check, Building2, History, Trash2, AlertTriangle, Maximize2,
  Lock, ChevronRight, Wand2, ExternalLink, RotateCcw, Eye, ClipboardList, Lightbulb, Paperclip, CornerDownRight,
} from "lucide-react";
import { CentralIcone, corDoModulo } from "@/lib/central-icons";
import type { FerramentaTelaDados, GeracaoTela } from "@/lib/central-dados";

// Uma ferramenta da Central: o usuário preenche o formulário, clica em "Preparar meu prompt" e
// recebe o prompt completo (template oficial + dados dele) pra colar no ChatGPT ou no Claude.
// A plataforma não executa IA nenhuma. modo "pagina" = /biblioteca/<produto>/<ferramenta>, com histórico ao lado;
// modo "painel" = coluna direita da biblioteca, mais compacta.

const CHATGPT_URL = "https://chatgpt.com/";
const CLAUDE_URL = "https://claude.ai/";

function quando(iso: string) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "Agora";
  if (min < 60) return `Há ${min} min`;
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `Hoje, ${hora}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${hora}`;
}

// Copia exatamente o texto; se o navegador bloquear a área de transferência, cai pro método antigo
async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

// Resumo de um prompt do histórico: os primeiros dados que a pessoa preencheu
function resumoEntradas(e: Record<string, string>) {
  const v = Object.values(e).map(x => (x ?? "").trim()).filter(Boolean);
  return v.length ? v.slice(0, 2).join(" · ").slice(0, 120) : "Sem dados extras (só o perfil da empresa)";
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
  const painel = modo === "painel";
  const anexo = ferramenta.produto.anexoNecessario; // ex: "o relatório de vendas (planilha ou PDF)"

  // Valores iniciais: prompt reutilizado > último prompt preparado > perfil da empresa
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const base = dados.reusarEntradas ?? dados.historico[0]?.entradas ?? {};
    return Object.fromEntries(ferramenta.campos.map(c => [c.key, base[c.key] || (c.perfil ? dados.perfilValores[c.perfil] ?? "" : "")]));
  });
  const [favorito, setFavorito] = useState(dados.favorito);
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [historico, setHistorico] = useState<GeracaoTela[]>(dados.historico);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null); // id do prompt copiado
  const [uso, setUso] = useState(dados.uso);
  const resultadoRef = useRef<HTMLElement>(null);
  const bloqueada = !uso.permitido;

  const atual = historico.find(h => h.id === atualId) ?? null;
  // Mudou o formulário depois de preparar? Avisa que o prompt mostrado é o anterior
  const desatualizado = useMemo(
    () => Boolean(atual) && ferramenta.campos.some(c => (valores[c.key] ?? "").trim() !== (atual!.entradas[c.key] ?? "").trim()),
    [atual, valores, ferramenta.campos],
  );

  function validar() {
    const e: Record<string, string> = {};
    for (const c of ferramenta.campos) {
      const v = (valores[c.key] ?? "").trim();
      if (c.obrigatorio && !v) e[c.key] = "Preencha este campo.";
      else if (c.tipo === "numero" && v) {
        const n = Number(v.replace(",", "."));
        if (!Number.isFinite(n)) e[c.key] = "Digite um número.";
        else if (c.min != null && n < c.min) e[c.key] = `Mínimo: ${c.min}.`;
        else if (c.max != null && n > c.max) e[c.key] = `Máximo: ${c.max}.`;
      }
    }
    setErrosCampo(e);
    return Object.keys(e).length === 0;
  }

  async function preparar() {
    if (preparando || bloqueada) return;
    if (!validar()) { setErro("Confira os campos destacados."); return; }
    setErro(null);
    setPreparando(true);
    try {
      const res = await fetch(`/api/central/ferramentas/${ferramenta.slug}/preparar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entradas: valores }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.geracao) {
        setErro(data.error ?? "Não foi possível preparar o prompt. Tente de novo.");
        if (res.status === 429) setUso(u => ({ ...u, permitido: false, motivo: data.error ?? u.motivo }));
        return;
      }
      if (typeof data.usosHoje === "number" && uso.limite) {
        const limite = uso.limite;
        setUso(u => ({ ...u, usosHoje: data.usosHoje, permitido: data.usosHoje < limite, motivo: data.usosHoje >= limite ? "Você atingiu o limite diário desta ferramenta. Volte amanhã!" : null }));
      }
      const g: GeracaoTela = { ...data.geracao, createdAt: new Date(data.geracao.createdAt).toISOString() };
      setHistorico(prev => [g, ...prev].slice(0, 30));
      setAtualId(g.id);
      requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setPreparando(false);
    }
  }

  async function copiar(g: GeracaoTela) {
    if (await copiarTexto(g.resultado)) {
      setCopiado(g.id);
      setTimeout(() => setCopiado(c => (c === g.id ? null : c)), 2500);
    } else {
      setErro("Não foi possível copiar automaticamente. Selecione o texto do prompt e copie com Ctrl+C.");
    }
  }

  async function alternarSalvo(g: GeracaoTela) {
    const salvo = !g.salvo;
    setHistorico(prev => prev.map(h => h.id === g.id ? { ...h, salvo } : h));
    const res = await fetch(`/api/central/geracoes/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salvo }),
    }).catch(() => null);
    if (!res?.ok) setHistorico(prev => prev.map(h => h.id === g.id ? { ...h, salvo: !salvo } : h));
  }

  async function excluir(g: GeracaoTela) {
    if (!confirm("Excluir este prompt do seu histórico?")) return;
    setHistorico(prev => prev.filter(h => h.id !== g.id));
    if (atualId === g.id) setAtualId(null);
    await fetch(`/api/central/geracoes/${g.id}`, { method: "DELETE" }).catch(() => null);
  }

  function reutilizar(g: GeracaoTela) {
    setValores(Object.fromEntries(ferramenta.campos.map(c => [c.key, g.entradas[c.key] ?? ""])));
    setErrosCampo({});
    setAtualId(g.id);
    requestAnimationFrame(() => document.getElementById(`form-${modo}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function ver(g: GeracaoTela) {
    setAtualId(g.id);
    requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function alternarFavorito() {
    const novo = !favorito;
    setFavorito(novo);
    onFavoritoChange?.(ferramenta.slug, novo);
    const res = await fetch(`/api/central/ferramentas/${ferramenta.slug}/favorito`, { method: "POST" }).catch(() => null);
    if (!res?.ok) { setFavorito(!novo); onFavoritoChange?.(ferramenta.slug, !novo); }
  }

  const inputCls = (erroCampo?: string) =>
    `w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${erroCampo ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/15"}`;
  const cartao = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const beneficio = ferramenta.formatoResposta || ferramenta.objetivo.replace(/^Você recebe:\s*/i, "");

  const cabecalho = (
    <div className={`${cartao} p-5`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        {painel ? (
          <button onClick={onFechar} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={15} /> Voltar para a biblioteca
          </button>
        ) : (
          <Link href={`/biblioteca/${ferramenta.produto.slug}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={15} /> Voltar para a biblioteca
          </Link>
        )}
        <div className="flex items-center gap-1">
          {painel && (
            <Link href={`/biblioteca/${ferramenta.produto.slug}/${ferramenta.slug}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Abrir em tela cheia" aria-label="Abrir em tela cheia">
              <Maximize2 size={15} />
            </Link>
          )}
          <button onClick={alternarFavorito} aria-pressed={favorito} aria-label={favorito ? "Remover ferramenta dos favoritos" : "Favoritar ferramenta"} title={favorito ? "Ferramenta favorita" : "Favoritar ferramenta"} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Star size={18} className={favorito ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-slate-500"} />
          </button>
        </div>
      </div>
      <div className="flex items-start gap-3.5">
        <div className={`w-12 h-12 rounded-xl ${cor.fundo} ${cor.icone} flex items-center justify-center flex-shrink-0`}>
          <CentralIcone nome={ferramenta.icone} size={22} />
        </div>
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cor.etiqueta}`}>{ferramenta.modulo.nome}</span>
          <h1 className={`${painel ? "text-lg" : "text-2xl"} mt-1.5 font-bold leading-tight text-slate-900`}>{ferramenta.nome}</h1>
          {ferramenta.descricao && <p className="text-sm text-slate-500 mt-1">{ferramenta.descricao}</p>}
        </div>
      </div>
      {beneficio && (
        <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5">
          <span className="font-medium text-slate-800">O que você vai receber da IA: </span>{beneficio}
        </p>
      )}
      {/* Como usar: o fluxo é sempre o mesmo; a dica é da ferramenta */}
      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-3 text-sm text-slate-600 space-y-2">
        <p className="font-medium text-slate-800">Como usar</p>
        <ol className="space-y-1 list-decimal pl-5 marker:text-indigo-500">
          <li>Preencha as informações abaixo e clique em <strong className="text-slate-800">Preparar meu prompt</strong>.</li>
          <li>Copie o prompt pronto.</li>
          {anexo
            ? <li>Abra o ChatGPT ou o Claude, <strong className="text-slate-800">anexe {anexo}</strong>, cole o prompt na mesma mensagem e envie.</li>
            : <li>Abra o ChatGPT ou o Claude, cole e envie.</li>}
        </ol>
        {ferramenta.comoUsar && <p className="flex items-start gap-1.5 pt-1"><Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-indigo-500" /> {ferramenta.comoUsar}</p>}
      </div>
    </div>
  );

  const formulario = (
    <section id={`form-${modo}`} className={`${cartao} p-5 space-y-3.5 scroll-mt-4`}>
      <h2 className="font-semibold text-slate-900">Suas informações</h2>
      <Link
        href="/biblioteca/meu-negocio"
        className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${perfilOk ? "bg-slate-50 text-slate-500 hover:text-slate-800" : "bg-amber-50 text-amber-800 hover:text-amber-900"}`}
      >
        {perfilOk ? <Building2 size={14} className="flex-shrink-0" /> : <AlertTriangle size={14} className="flex-shrink-0" />}
        <span className="min-w-0">
          {perfilOk
            ? <>O prompt inclui o perfil de <strong className="font-medium text-slate-700">{nomeEmpresa || "sua empresa"}</strong> · editar perfil</>
            : "Complete o perfil da sua empresa: ele entra no prompt e deixa a resposta da IA muito mais certeira →"}
        </span>
      </Link>

      {ferramenta.campos.map(c => {
        const id = `${modo}-campo-${c.key}`;
        const e = errosCampo[c.key];
        const doPerfil = c.perfil && valores[c.key] && (valores[c.key] ?? "") === (dados.perfilValores[c.perfil] ?? "");
        const mudar = (v: string) => {
          setValores(prev => ({ ...prev, [c.key]: v }));
          if (e) setErrosCampo(prev => { const n = { ...prev }; delete n[c.key]; return n; });
        };
        return (
          <div key={c.key} className="space-y-1.5">
            <label htmlFor={id} className="text-sm text-slate-700">
              {c.label}{c.obrigatorio ? <span className="text-red-500"> *</span> : <span className="text-slate-400"> (opcional)</span>}
              {doPerfil && <span className="ml-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">do seu perfil</span>}
            </label>
            {c.tipo === "textarea" ? (
              <textarea id={id} value={valores[c.key] ?? ""} onChange={ev => mudar(ev.target.value)} rows={3} maxLength={c.maxCaracteres ?? 3000}
                placeholder={c.placeholder} disabled={preparando} aria-invalid={Boolean(e)} className={`${inputCls(e)} resize-y`} />
            ) : c.tipo === "select" ? (
              <select id={id} value={valores[c.key] ?? ""} onChange={ev => mudar(ev.target.value)} disabled={preparando} aria-invalid={Boolean(e)} className={inputCls(e)}>
                <option value="">Selecione...</option>
                {(c.opcoes ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={id} type={c.tipo === "numero" ? "number" : "text"} min={c.min} max={c.max} value={valores[c.key] ?? ""}
                onChange={ev => mudar(ev.target.value)} maxLength={c.maxCaracteres ?? 3000} placeholder={c.placeholder}
                disabled={preparando} aria-invalid={Boolean(e)} className={inputCls(e)} />
            )}
            {e ? <p className="text-xs text-red-600">{e}</p> : c.ajuda && <p className="text-xs text-slate-400">{c.ajuda}</p>}
          </div>
        );
      })}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {bloqueada && uso.motivo && (
        <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-xl px-3.5 py-2.5"><Lock size={15} className="mt-0.5 flex-shrink-0" /> {uso.motivo}</p>
      )}
      <button
        onClick={preparar}
        disabled={preparando || bloqueada}
        className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-sm font-semibold shadow-sm shadow-indigo-600/20 disabled:opacity-60"
      >
        {preparando ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        {preparando ? "Preparando..." : atual ? "Preparar de novo com estes dados" : "Preparar meu prompt"}
      </button>
      {uso.limite != null && <p className="text-center text-xs text-slate-400 tabular-nums">{uso.usosHoje} de {uso.limite} prompts hoje</p>}
    </section>
  );

  const botaoExterno = "flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700";
  const resultado = atual && (
    <section ref={resultadoRef} className={`${cartao} p-5 scroll-mt-4`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2"><ClipboardList size={17} className="text-indigo-600" /> Seu prompt está pronto</h2>
        <span className="text-xs text-slate-400">{quando(atual.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-500 mb-3">Copie, abra a sua IA e cole com <strong className="text-slate-700">Ctrl+V</strong> (no celular: toque e segure → Colar). A Vendas IA não envia o prompt sozinha.</p>
      {anexo && (
        <p className="mb-3 flex items-start gap-2 text-sm text-indigo-800 bg-indigo-50 rounded-lg px-3 py-2">
          <Paperclip size={15} className="mt-0.5 flex-shrink-0" /> Não esqueça: anexe {anexo} na conversa do ChatGPT ou do Claude junto com este prompt. A análise é feita lá, com o seu arquivo.
        </p>
      )}
      {desatualizado && (
        <p className="mb-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> Você mudou as informações depois de preparar. Clique em &quot;Preparar de novo&quot; para atualizar o prompt.
        </p>
      )}
      <pre
        tabIndex={0}
        aria-label="Prompt pronto para copiar"
        className={`whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-slate-200 p-4 text-[13px] leading-relaxed text-slate-700 font-mono overflow-y-auto ${painel ? "max-h-[360px]" : "max-h-[520px]"}`}
      >
        {atual.resultado}
      </pre>
      <button
        onClick={() => copiar(atual)}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20"
      >
        {copiado === atual.id ? <Check size={16} /> : <Copy size={16} />} {copiado === atual.id ? "Prompt copiado!" : "Copiar prompt"}
      </button>
      <div className="mt-2 flex gap-2 flex-wrap">
        <a href={CHATGPT_URL} target="_blank" rel="noopener noreferrer" className={botaoExterno}>Abrir ChatGPT <ExternalLink size={14} className="text-slate-400" /></a>
        <a href={CLAUDE_URL} target="_blank" rel="noopener noreferrer" className={botaoExterno}>Abrir Claude <ExternalLink size={14} className="text-slate-400" /></a>
        <button onClick={() => alternarSalvo(atual)} aria-pressed={atual.salvo} className={botaoExterno}>
          <Star size={15} className={atual.salvo ? "fill-amber-400 text-amber-400" : "text-slate-400"} /> {atual.salvo ? "Nos favoritos" : "Favoritar prompt"}
        </button>
      </div>

      {/* Prompt de continuação: colar depois da 1ª resposta, na mesma conversa */}
      {ferramenta.continuacao && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><CornerDownRight size={15} className="text-indigo-600" /> Depois da resposta, continue com:</p>
          <p className="text-xs text-slate-500">Cole este prompt na <strong className="text-slate-700">mesma conversa</strong>, depois que a IA responder ao primeiro.</p>
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-white border border-slate-200 p-3 text-[13px] leading-relaxed text-slate-700 font-mono">{ferramenta.continuacao}</pre>
          <button
            onClick={async () => { if (await copiarTexto(ferramenta.continuacao)) { setCopiado("continuacao"); setTimeout(() => setCopiado(c => (c === "continuacao" ? null : c)), 2500); } }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
          >
            {copiado === "continuacao" ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />} {copiado === "continuacao" ? "Copiado!" : "Copiar continuação"}
          </button>
        </div>
      )}
    </section>
  );

  const listaHistorico = (limite: number) => historico.length === 0 ? (
    <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-300 p-4">Os prompts que você preparar ficam aqui para copiar ou reutilizar depois.</p>
  ) : (
    <ul className="space-y-2">
      {historico.slice(0, limite).map(h => (
        <li key={h.id} className={`rounded-xl border px-3 py-2.5 ${h.id === atualId ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white"}`}>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            {quando(h.createdAt)} {h.salvo && <Star size={11} className="fill-amber-400 text-amber-400" aria-label="Favorito" />}
          </p>
          <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">{resumoEntradas(h.entradas)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <button onClick={() => ver(h)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"><Eye size={12} /> Ver</button>
            <button onClick={() => copiar(h)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
              {copiado === h.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />} {copiado === h.id ? "Copiado" : "Copiar"}
            </button>
            <button onClick={() => reutilizar(h)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"><RotateCcw size={12} /> Reutilizar</button>
            <button onClick={() => alternarSalvo(h)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
              <Star size={12} className={h.salvo ? "fill-amber-400 text-amber-400" : ""} /> {h.salvo ? "Favorito" : "Favoritar"}
            </button>
            <button onClick={() => excluir(h)} className="inline-flex items-center gap-1 text-slate-400 hover:text-red-500 ml-auto" aria-label="Excluir do histórico"><Trash2 size={12} /></button>
          </div>
        </li>
      ))}
    </ul>
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
                : <Link href={`/biblioteca/${r.produtoSlug}/${r.slug}`} className={cls}>{conteudo}</Link>}
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
        {historico.length > 0 && (
          <section className={`${cartao} p-5`}>
            <h2 className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mb-2.5"><History size={14} /> Seus prompts nesta ferramenta</h2>
            {listaHistorico(5)}
          </section>
        )}
        {relacionadas}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5 min-w-0">
        {cabecalho}
        {formulario}
        {resultado}
        {relacionadas}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-4 self-start">
        <h2 className="text-sm font-medium text-slate-500 flex items-center gap-1.5"><History size={14} /> Seus prompts nesta ferramenta</h2>
        {listaHistorico(15)}
      </aside>
    </div>
  );
}
