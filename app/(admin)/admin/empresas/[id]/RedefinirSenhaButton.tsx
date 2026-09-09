"use client";

import { useState } from "react";
import { KeyRound, Check, X, Save } from "lucide-react";

export function RedefinirSenhaButton({ profileId }: { profileId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "no-email" | "error">("idle");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualDone, setManualDone] = useState(false);

  async function handleEmailClick() {
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

  async function handleManualSave() {
    setManualError(null);
    setManualSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${profileId}/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: manualPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setManualError(data.error ?? "Erro ao definir senha."); return; }
      setManualDone(true);
      setManualPassword("");
    } catch {
      setManualError("Erro ao definir senha.");
    } finally {
      setManualSaving(false);
    }
  }

  if (manualDone) {
    return <span className="text-xs font-semibold text-green-400 flex items-center gap-1 flex-shrink-0"><Check size={13} /> Senha definida</span>;
  }

  if (manualOpen) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          autoFocus
          value={manualPassword}
          onChange={e => { setManualPassword(e.target.value); setManualError(null); }}
          placeholder="Nova senha"
          className="text-xs bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 w-32 focus:outline-none focus:border-blue-600"
        />
        <button
          onClick={handleManualSave}
          disabled={manualSaving || manualPassword.length === 0}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-1"
        >
          <Save size={12} /> {manualSaving ? "..." : "Salvar"}
        </button>
        <button
          onClick={() => { setManualOpen(false); setManualError(null); setManualPassword(""); }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          <X size={14} />
        </button>
        {manualError && <span className="text-xs text-red-400">{manualError}</span>}
      </div>
    );
  }

  if (state === "done") {
    return <span className="text-xs font-semibold text-green-400 flex items-center gap-1 flex-shrink-0"><Check size={13} /> Link enviado</span>;
  }
  if (state === "no-email") {
    return <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 flex-shrink-0" title="Token gerado, mas o e-mail não pôde ser enviado (RESEND_API_KEY?)"><Check size={13} /> Token gerado, e-mail falhou</span>;
  }
  if (state === "error") {
    return (
      <button onClick={handleEmailClick} className="text-xs font-semibold text-red-400 flex items-center gap-1 flex-shrink-0 hover:text-red-300">
        <X size={13} /> Erro, tentar de novo
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={handleEmailClick}
        disabled={state === "loading"}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400 disabled:opacity-50 flex items-center gap-1.5"
      >
        <KeyRound size={13} />
        {state === "loading" ? "Enviando..." : "Redefinir senha"}
      </button>
      <button onClick={() => setManualOpen(true)} className="text-xs text-gray-500 hover:text-blue-400 underline underline-offset-2">
        definir manualmente
      </button>
    </div>
  );
}
