"use client";

import { useState } from "react";
import { KeyRound, Check, X } from "lucide-react";

export function RedefinirSenhaButton({ profileId }: { profileId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "no-email" | "error">("idle");

  async function handleClick() {
    if (state === "loading") return;
    if (!confirm("Enviar e-mail de redefinição de senha pra esse usuário?")) return;

    setState("loading");
    try {
      const res = await fetch(`/api/admin/usuarios/${profileId}/redefinir-senha`, { method: "POST" });
      if (!res.ok) { setState("error"); return; }
      const data = await res.json();
      setState(data.emailSent ? "done" : "no-email");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <span className="text-xs font-semibold text-green-400 flex items-center gap-1 flex-shrink-0"><Check size={13} /> Link enviado</span>;
  }
  if (state === "no-email") {
    return <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 flex-shrink-0" title="Token gerado, mas o e-mail não pôde ser enviado (RESEND_API_KEY?)"><Check size={13} /> Token gerado, e-mail falhou</span>;
  }
  if (state === "error") {
    return (
      <button onClick={handleClick} className="text-xs font-semibold text-red-400 flex items-center gap-1 flex-shrink-0 hover:text-red-300">
        <X size={13} /> Erro, tentar de novo
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
    >
      <KeyRound size={13} />
      {state === "loading" ? "Enviando..." : "Redefinir senha"}
    </button>
  );
}
