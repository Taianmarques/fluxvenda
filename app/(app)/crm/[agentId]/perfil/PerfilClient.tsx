"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm";

function SaveButton({ saving, saved, children = "Salvar" }: { saving: boolean; saved: boolean; children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
      {saving ? "Salvando..." : saved ? "Salvo!" : children}
    </button>
  );
}

export function PerfilClient({
  nomeInicial,
  emailInicial,
  telefoneInicial,
  temSenha,
  empresaNomeInicial,
}: {
  nomeInicial: string;
  emailInicial: string;
  telefoneInicial: string;
  temSenha: boolean;
  empresaNomeInicial: string | null;
}) {
  const router = useRouter();

  // Nome / contato
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savedPerfil, setSavedPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState("");

  // E-mail
  const [email, setEmail] = useState(emailInicial);
  const [senhaParaEmail, setSenhaParaEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [erroEmail, setErroEmail] = useState("");

  // Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);
  const [savedSenha, setSavedSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  // Empresa
  const [empresaNome, setEmpresaNome] = useState(empresaNomeInicial ?? "");
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [savedEmpresa, setSavedEmpresa] = useState(false);
  const [erroEmpresa, setErroEmpresa] = useState("");

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSavingPerfil(true);
    setErroPerfil("");
    setSavedPerfil(false);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, phone: telefone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      setSavedPerfil(true);
      router.refresh();
      setTimeout(() => setSavedPerfil(false), 2000);
    } catch (e: any) {
      setErroPerfil(e.message);
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleSalvarEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setErroEmail("");
    setSavedEmail(false);
    try {
      const res = await fetch("/api/perfil/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoEmail: email, senhaAtual: senhaParaEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao trocar e-mail.");
      setSavedEmail(true);
      setSenhaParaEmail("");
      router.refresh();
      setTimeout(() => setSavedEmail(false), 2000);
    } catch (e: any) {
      setErroEmail(e.message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha("");
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }
    setSavingSenha(true);
    setSavedSenha(false);
    try {
      const res = await fetch("/api/perfil/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: temSenha ? senhaAtual : undefined, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao trocar senha.");
      setSavedSenha(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSavedSenha(false), 2000);
    } catch (e: any) {
      setErroSenha(e.message);
    } finally {
      setSavingSenha(false);
    }
  }

  async function handleSalvarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmpresa(true);
    setErroEmpresa("");
    setSavedEmpresa(false);
    try {
      const res = await fetch("/api/equipe/nome", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: empresaNome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
      setSavedEmpresa(true);
      router.refresh();
      setTimeout(() => setSavedEmpresa(false), 2000);
    } catch (e: any) {
      setErroEmpresa(e.message);
    } finally {
      setSavingEmpresa(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {empresaNomeInicial !== null && (
        <form onSubmit={handleSalvarEmpresa}>
          <Card title="Empresa" description="Nome usado nos e-mails e mensagens automáticas da equipe.">
            <Field label="Nome da empresa">
              <input value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} className={inputCls} />
            </Field>
            {erroEmpresa && <p className="text-xs text-red-400">{erroEmpresa}</p>}
            <SaveButton saving={savingEmpresa} saved={savedEmpresa} />
          </Card>
        </form>
      )}

      <form onSubmit={handleSalvarPerfil}>
        <Card title="Seus dados" description="Nome de perfil e contato exibidos no CRM.">
          <Field label="Nome de perfil">
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Contato / WhatsApp (opcional)">
            <input value={telefone} onChange={e => setTelefone(e.target.value)} type="tel" placeholder="Ex: 11999999999" className={inputCls} />
          </Field>
          {erroPerfil && <p className="text-xs text-red-400">{erroPerfil}</p>}
          <SaveButton saving={savingPerfil} saved={savedPerfil} />
        </Card>
      </form>

      <form onSubmit={handleSalvarEmail}>
        <Card title="E-mail de acesso" description="Usado pra fazer login. Trocar exige sua senha atual.">
          <Field label="E-mail">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} />
          </Field>
          <Field label="Senha atual">
            <input value={senhaParaEmail} onChange={e => setSenhaParaEmail(e.target.value)} type="password" placeholder="Confirme sua senha" className={inputCls} />
          </Field>
          {erroEmail && <p className="text-xs text-red-400">{erroEmail}</p>}
          <SaveButton saving={savingEmail} saved={savedEmail} />
        </Card>
      </form>

      <form onSubmit={handleSalvarSenha}>
        <Card title="Senha" description={temSenha ? "Informe a senha atual pra definir uma nova." : "Sua conta ainda não tem senha — defina uma agora."}>
          {temSenha && (
            <Field label="Senha atual">
              <input value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} type="password" className={inputCls} />
            </Field>
          )}
          <Field label="Nova senha">
            <input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type="password" placeholder="Mínimo 8 caracteres, com letra e número" className={inputCls} />
          </Field>
          <Field label="Confirmar nova senha">
            <input value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} type="password" className={inputCls} />
          </Field>
          {erroSenha && <p className="text-xs text-red-400">{erroSenha}</p>}
          <SaveButton saving={savingSenha} saved={savedSenha}>{temSenha ? "Trocar senha" : "Definir senha"}</SaveButton>
        </Card>
      </form>
    </div>
  );
}
