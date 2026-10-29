"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Check, Loader2 } from "lucide-react";
import { PERFIL_CAMPOS, PERFIL_ESSENCIAIS, perfilCompleto, type PerfilEmpresaDados } from "@/lib/central-shared";

export function PerfilEmpresaClient({ inicial }: { inicial: PerfilEmpresaDados }) {
  const router = useRouter();
  const [dados, setDados] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pct = perfilCompleto(dados);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/central/perfil", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(data.error ?? "Não foi possível salvar."); return; }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const inputCls = "w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500";

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900"><div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/central" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} /> Central de Ferramentas
      </Link>

      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Building2 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Perfil da empresa</h1>
          <p className="text-slate-500 mt-1">
            Preencha uma vez. Todas as ferramentas usam essas informações para criar respostas com a cara do seu negócio.
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm tabular-nums text-slate-500">{pct}% completo</span>
      </div>

      <form onSubmit={salvar} className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 space-y-4">
        {PERFIL_CAMPOS.map(c => {
          const essencial = PERFIL_ESSENCIAIS.includes(c.key);
          return (
            <div key={c.key} className="space-y-1.5">
              <label htmlFor={`perfil-${c.key}`} className="text-sm font-medium text-slate-700">
                {c.label} {essencial && <span className="text-xs font-normal text-indigo-600 ml-1">essencial</span>}
              </label>
              {c.tipo === "textarea" ? (
                <textarea
                  id={`perfil-${c.key}`} rows={3} maxLength={2000} value={dados[c.key]} placeholder={c.placeholder}
                  onChange={e => setDados(d => ({ ...d, [c.key]: e.target.value }))} className={`${inputCls} resize-y`}
                />
              ) : (
                <input
                  id={`perfil-${c.key}`} maxLength={200} value={dados[c.key]} placeholder={c.placeholder}
                  onChange={e => setDados(d => ({ ...d, [c.key]: e.target.value }))} className={inputCls}
                />
              )}
            </div>
          );
        })}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={salvando} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-70">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : salvo ? <Check size={16} /> : null}
            {salvando ? "Salvando..." : salvo ? "Salvo" : "Salvar perfil"}
          </button>
          <p className="text-xs text-slate-400">Se você tem equipe, o perfil é compartilhado com ela.</p>
        </div>
      </form>
    </div>
    </div>
  );
}
