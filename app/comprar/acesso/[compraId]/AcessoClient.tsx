"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15";

// Conta nova: define a senha e já entra (a API cria a sessão)
export function CriarSenhaForm({ compraId, token, destino }: { compraId: string; token: string; destino: string }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    if (senha !== confirmar) { setErro("As senhas não são iguais."); return; }
    setErro(null);
    setEnviando(true);
    const res = await fetch(`/api/comprar/acesso/${compraId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, senha }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { setErro(d?.error ?? "Não foi possível criar a senha. Tente de novo."); setEnviando(false); return; }
    window.location.assign(destino);
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="relative">
        <label htmlFor="ac-senha" className="text-sm text-slate-700">Senha</label>
        <input id="ac-senha" type={ver ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres, com letra e número" className={`${input} mt-1 pr-10`} />
        <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} className="absolute right-3 top-[2.15rem] text-slate-400 hover:text-slate-700">
          {ver ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      <div>
        <label htmlFor="ac-confirmar" className="text-sm text-slate-700">Confirme a senha</label>
        <input id="ac-confirmar" type={ver ? "text" : "password"} value={confirmar} onChange={e => setConfirmar(e.target.value)} required autoComplete="new-password" className={`${input} mt-1`} />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button type="submit" disabled={enviando} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {enviando && <Loader2 size={16} className="animate-spin" />} Criar senha e acessar
      </button>
    </form>
  );
}

// Link aberto antes da confirmação (ex: Pix ainda processando): consulta e recarrega quando pagar
export function AguardandoPagamento({ compraId }: { compraId: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(async () => {
      const d = await fetch(`/api/comprar/status/${compraId}`).then(r => r.json()).catch(() => null);
      if (d?.status && d.status !== "PENDENTE") router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [compraId, router]);
  return (
    <div className="text-center space-y-3">
      <Loader2 size={40} className="mx-auto text-indigo-500 animate-spin" />
      <h1 className="text-xl font-bold">Aguardando a confirmação do pagamento</h1>
      <p className="text-sm text-slate-600">Assim que o pagamento for confirmado, esta página libera o seu acesso automaticamente.</p>
    </div>
  );
}
