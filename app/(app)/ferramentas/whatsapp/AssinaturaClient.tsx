"use client";

import { useState } from "react";

export function AssinaturaClient({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function handleToggle(value: boolean) {
    setEnabled(value);
    setSaving(true);
    try {
      await fetch("/api/ferramentas/whatsapp/assinatura", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureEnabled: value }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={enabled} disabled={saving} onChange={e => handleToggle(e.target.checked)} className="w-4 h-4" />
        <span className="font-semibold">✍️ Assinar mensagens com o nome do atendente</span>
      </label>
      <p className="text-xs text-gray-500">
        Quando ativo, toda mensagem manual sai no WhatsApp como <span className="text-gray-300">*Nome do atendente:*</span> seguido do texto — útil pra equipes com vários atendentes no mesmo número.
      </p>
    </div>
  );
}
