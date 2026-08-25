"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FollowupDelaysEditor, minutesToRow, rowToMinutes, type DelayRow } from "./WhatsappAgentClient";

export function FollowupPanel({
  agentId, initialFollowupEnabled, initialFollowupDelaysMinutes,
}: {
  agentId: string;
  initialFollowupEnabled: boolean;
  initialFollowupDelaysMinutes: number[];
}) {
  const router = useRouter();
  const [followupEnabled, setFollowupEnabled] = useState(initialFollowupEnabled);
  const [followupDelays, setFollowupDelays] = useState<DelayRow[]>(
    (initialFollowupDelaysMinutes.length ? initialFollowupDelaysMinutes : [1440, 1440]).map(minutesToRow)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function addFollowupAttempt() {
    const last = followupDelays[followupDelays.length - 1] ?? { value: 24, unit: "horas" as const };
    setFollowupDelays([...followupDelays, { ...last }]);
    setSaved(false);
  }
  function removeFollowupAttempt(i: number) {
    setFollowupDelays(followupDelays.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function updateFollowupAttempt(i: number, row: Partial<DelayRow>) {
    setFollowupDelays(followupDelays.map((r, idx) => (idx === i ? { ...r, ...row } : r)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followupEnabled,
          followupDelaysMinutes: followupDelays.map(rowToMinutes),
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      <p className="text-sm text-gray-400">Se o contato não responder, o agente manda uma mensagem de retomada sozinho, usando o contexto da conversa.</p>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={followupEnabled}
          onChange={e => { setFollowupEnabled(e.target.checked); setSaved(false); }}
          className="w-4 h-4"
        />
        <span className="text-sm">Ativar follow-up automático</span>
      </label>

      {followupEnabled && (
        <FollowupDelaysEditor
          followupDelays={followupDelays}
          onAdd={addFollowupAttempt}
          onRemove={removeFollowupAttempt}
          onUpdate={updateFollowupAttempt}
        />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-sm text-green-400">Salvo!</span>}
      </div>
    </div>
  );
}
