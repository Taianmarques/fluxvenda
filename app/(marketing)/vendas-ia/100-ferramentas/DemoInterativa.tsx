"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import type { CampoFerramenta } from "@/lib/central-shared";

export type FerramentaDemo = { slug: string; rotulo: string; nome: string; descricao: string; objetivo: string; campos: CampoFerramenta[] };

const campoCls = "w-full rounded-xl border border-[var(--line-strong)] bg-white/[.04] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[rgba(237,235,230,.35)] focus:outline-none focus:border-[var(--acc)]";

// Demonstração gratuita: 3 ferramentas reais (marcadas como demo no banco), cada uma com o seu
// formulário. O prompt é montado no servidor pelo mesmo mecanismo da biblioteca (/api/demo/preparar).
export function DemoInterativa({ ferramentas, checkoutHref, preco, total }: { ferramentas: FerramentaDemo[]; checkoutHref: string; preco: string; total: number }) {
  const [ativa, setAtiva] = useState(0);
  const [entradas, setEntradas] = useState<Record<string, Record<string, string>>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const f = ferramentas[ativa];
  if (!f) return null;
  const valores = entradas[f.slug] ?? {};
  const prompt = prompts[f.slug];

  function mudar(key: string, v: string) {
    setEntradas(e => ({ ...e, [f.slug]: { ...(e[f.slug] ?? {}), [key]: v } }));
  }

  async function preparar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const faltando = f.campos.find(c => c.obrigatorio && !(valores[c.key] ?? "").trim());
    if (faltando) { setErro(`Preencha "${faltando.label}"`); return; }
    setPreparando(true);
    try {
      const res = await fetch("/api/demo/preparar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: f.slug, entradas: valores }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(data.error ?? "Não foi possível preparar o prompt."); return; }
      setPrompts(p => ({ ...p, [f.slug]: data.prompt }));
      setCopiado(false);
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setPreparando(false);
    }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(prompt); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* sem permissão de clipboard: o texto continua selecionável */ }
  }

  return (
    <div className="space-y-5">
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {ferramentas.map((x, i) => (
          <button
            key={x.slug} role="tab" aria-selected={i === ativa}
            onClick={() => { setAtiva(i); setErro(null); setCopiado(false); }}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${i === ativa ? "border-[var(--acc)] bg-[var(--acc-dim)] text-[var(--acc-bright)]" : "border-[var(--line-strong)] text-[var(--body)] hover:text-[var(--text)]"}`}
          >
            <span className="font-[family-name:var(--f-mono)] text-[11px] mr-1.5 opacity-70">{String.fromCharCode(65 + i)}</span>{x.rotulo}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={preparar} className="rounded-2xl border border-[var(--line)] bg-white/[.03] p-5 md:p-6 space-y-4">
          <div>
            <p className="font-semibold">{f.nome}</p>
            <p className="text-sm text-[var(--body)] mt-0.5">{f.descricao}</p>
          </div>
          {f.campos.map(c => (
            <label key={c.key} className="block">
              <span className="block text-sm mb-1.5">{c.label}{c.obrigatorio ? <span className="text-[var(--acc)]"> *</span> : <span className="text-[var(--muted)]"> (opcional)</span>}</span>
              {c.tipo === "textarea" ? (
                <textarea rows={3} value={valores[c.key] ?? ""} onChange={e => mudar(c.key, e.target.value)} placeholder={c.placeholder} maxLength={c.maxCaracteres} className={`${campoCls} resize-y`} />
              ) : c.tipo === "select" ? (
                <select value={valores[c.key] ?? ""} onChange={e => mudar(c.key, e.target.value)} className={`${campoCls} [&>option]:bg-[#111115]`}>
                  <option value="">Escolha…</option>
                  {(c.opcoes ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={valores[c.key] ?? ""} onChange={e => mudar(c.key, e.target.value)} placeholder={c.placeholder} maxLength={c.maxCaracteres} className={campoCls} />
              )}
            </label>
          ))}
          {erro && <p className="text-sm text-red-300">{erro}</p>}
          <button disabled={preparando} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] text-[var(--on-acc)] font-semibold py-3 disabled:opacity-60">
            {preparando ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} Preparar meu prompt
          </button>
        </form>

        <div className="rounded-2xl border border-[var(--line)] bg-black/30 p-5 md:p-6 flex flex-col min-h-[22rem]">
          <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.18em] uppercase text-[var(--acc)]">Seu prompt</p>
          {prompt ? (
            <>
              <pre className="mt-3 flex-1 max-h-[26rem] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--line)] bg-black/40 p-4 font-[family-name:var(--f-mono)] text-[12px] leading-relaxed text-[var(--body)]">{prompt}</pre>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--acc)] text-[var(--on-acc)] px-4 py-2 text-sm font-semibold">
                  {copiado ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar prompt</>}
                </button>
                <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] hover:border-[var(--acc)] px-4 py-2 text-sm"><ExternalLink size={14} /> Abrir ChatGPT</a>
                <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] hover:border-[var(--acc)] px-4 py-2 text-sm"><ExternalLink size={14} /> Abrir Claude</a>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">Copie o prompt, abra o ChatGPT ou o Claude e cole na conversa. Nada é enviado automaticamente para essas IAs.</p>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--muted)] text-sm px-6">
              <Sparkles size={26} className="text-[var(--acc)] mb-3" />
              Preencha o formulário e clique em <strong className="text-[var(--text)] mx-1">Preparar meu prompt</strong> para ver o comando completo, montado com as suas respostas.
              {f.objetivo && <span className="mt-3 text-xs">{f.objetivo}</span>}
            </div>
          )}
        </div>
      </div>

      {prompt && (
        <div className="rounded-2xl border border-[rgba(251,191,36,.35)] bg-[var(--acc-dim)] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-lg font-semibold">Gostou? Tenha acesso às {total} ferramentas por {preco}.</p>
          <Link href={checkoutHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] text-[var(--on-acc)] font-semibold px-6 py-3 flex-shrink-0">
            Quero as {total} ferramentas <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
