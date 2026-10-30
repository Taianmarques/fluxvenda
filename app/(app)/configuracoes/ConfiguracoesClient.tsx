"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, KeyRound, Loader2, Settings, UserRound } from "lucide-react";

const inputCls = "w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500";
const cartao = "rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function Status({ erro, ok, textoOk }: { erro: string | null; ok: boolean; textoOk: string }) {
  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (ok) return <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5"><Check size={15} /> {textoOk}</p>;
  return null;
}

export function ConfiguracoesClient({ nome, email, telefone, temSenha }: { nome: string; email: string; telefone: string; temSenha: boolean }) {
  const router = useRouter();

  const [novoNome, setNovoNome] = useState(nome);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [okNome, setOkNome] = useState(false);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [okSenha, setOkSenha] = useState(false);

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    setErroNome(null); setOkNome(false); setSalvandoNome(true);
    try {
      const res = await fetch("/api/conta", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: novoNome }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroNome(data.error ?? "Não foi possível salvar."); return; }
      setOkNome(true);
      router.refresh();
    } catch {
      setErroNome("Falha de conexão. Tente de novo.");
    } finally {
      setSalvandoNome(false);
    }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha(null); setOkSenha(false);
    if (nova !== confirma) { setErroSenha("A confirmação não confere com a nova senha."); return; }
    setSalvandoSenha(true);
    try {
      const res = await fetch("/api/conta/senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ atual, nova }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroSenha(data.error ?? "Não foi possível trocar a senha."); return; }
      setOkSenha(true);
      setAtual(""); setNova(""); setConfirma("");
      router.refresh();
    } catch {
      setErroSenha("Falha de conexão. Tente de novo.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5"><Settings size={26} className="text-blue-600" /> Configurações</h1>
          <p className="text-slate-500 mt-1.5">Seus dados de acesso e a senha da conta.</p>
        </header>

        <form onSubmit={salvarNome} className={`${cartao} space-y-4`}>
          <h2 className="font-semibold flex items-center gap-2"><UserRound size={18} className="text-blue-600" /> Dados pessoais</h2>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">Nome</span>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} maxLength={80} className={inputCls} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">E-mail de acesso</span>
              <input value={email} disabled className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp</span>
              <input value={telefone || "—"} disabled className={inputCls} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={salvandoNome || novoNome.trim() === nome} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white">
              {salvandoNome && <Loader2 size={15} className="animate-spin" />} Salvar
            </button>
            <Status erro={erroNome} ok={okNome} textoOk="Nome atualizado." />
          </div>
        </form>

        <form onSubmit={salvarSenha} className={`${cartao} space-y-4`}>
          <h2 className="font-semibold flex items-center gap-2"><KeyRound size={18} className="text-blue-600" /> {temSenha ? "Trocar senha" : "Criar senha"}</h2>
          {temSenha && (
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Senha atual</span>
              <input type="password" value={atual} onChange={e => setAtual(e.target.value)} autoComplete="current-password" className={inputCls} />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Nova senha</span>
              <input type="password" value={nova} onChange={e => setNova(e.target.value)} autoComplete="new-password" className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Confirme a nova senha</span>
              <input type="password" value={confirma} onChange={e => setConfirma(e.target.value)} autoComplete="new-password" className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Mínimo de 8 caracteres, com pelo menos uma letra e um número.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={salvandoSenha || !nova || (temSenha && !atual)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white">
              {salvandoSenha && <Loader2 size={15} className="animate-spin" />} {temSenha ? "Trocar senha" : "Criar senha"}
            </button>
            <Status erro={erroSenha} ok={okSenha} textoOk="Senha salva." />
          </div>
        </form>

        <Link href="/biblioteca/meu-negocio" className={`${cartao} flex items-center gap-4 hover:border-slate-300`}>
          <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><Building2 size={20} /></span>
          <span>
            <span className="block font-semibold">Dados da empresa</span>
            <span className="block text-sm text-slate-500">Os dados do seu negócio que personalizam os prompts ficam em Minha Empresa.</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
