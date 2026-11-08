"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";

const PODE = ["Ver contatos e conversas do WhatsApp", "Ver funil, oportunidades e agendamentos", "Ver formulários, respostas e relatórios"];

export function ConectarClient({ pedido, cliente, nome, email, superadmin }: { pedido: Record<string, string>; cliente: string; nome: string; email: string; superadmin: boolean }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function responder(aprovar: boolean) {
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/mcp/oauth/autorizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aprovar, pedido }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect) {
        setErro(data.error ?? "Não foi possível concluir. Tente novamente.");
        setEnviando(false);
        return;
      }
      window.location.href = data.redirect;
    } catch {
      setErro("Não foi possível concluir. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Conectar o {cliente} ao FluxVenda</h1>
        <p className="text-sm text-gray-500 mt-1">Entrando como {nome ? `${nome} (${email})` : email}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">O {cliente} poderá:</p>
        <ul className="space-y-1.5">
          {PODE.map(t => <li key={t} className="text-sm text-gray-600 flex gap-2"><Check size={16} className="text-green-600 shrink-0 mt-0.5" /> {t}</li>)}
          {superadmin && <li className="text-sm text-gray-600 flex gap-2"><Check size={16} className="text-green-600 shrink-0 mt-0.5" /> Superadmin: ver a identidade da marca e guardar imagens e vídeos na biblioteca</li>}
        </ul>
      </div>

      <p className="text-xs text-gray-500 flex gap-2 bg-gray-50 rounded-xl p-3">
        <ShieldCheck size={16} className="text-blue-600 shrink-0" />
        <span>Acesso somente de leitura ao CRM, limitado ao que você já vê no FluxVenda. O {cliente} não envia mensagens nem altera dados. Você pode desconectar quando quiser em Configurações.</span>
      </p>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex gap-3">
        <button type="button" disabled={enviando} onClick={() => responder(false)} className="flex-1 py-3 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 rounded-xl font-semibold text-gray-700 transition-colors">Cancelar</button>
        <button type="button" disabled={enviando} onClick={() => responder(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-white transition-colors">{enviando ? "Conectando..." : "Permitir acesso"}</button>
      </div>
    </div>
  );
}
