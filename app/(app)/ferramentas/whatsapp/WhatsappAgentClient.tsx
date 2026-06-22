"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InitialConfig = {
  nome: string;
  tom: string;
  servicos: string[];
  objecoes: string[];
  horario: string;
  uazapiInstance: string | null;
  hasToken: boolean;
  followupEnabled: boolean;
  followupDelayHours: number;
  followupMaxAttempts: number;
} | null;

const TOM_OPTIONS = [
  { value: "FORMAL", label: "Formal", description: "Protocolar, direto ao ponto" },
  { value: "PROXIMO", label: "Próximo", description: "Descontraído e caloroso" },
  { value: "CONSULTIVO", label: "Consultivo", description: "Atencioso, entende antes de oferecer" },
];

type ChatMsg = { role: "user" | "assistant"; content: string };

export function WhatsappAgentClient({ initialConfig }: { initialConfig: InitialConfig }) {
  const router = useRouter();
  const isConfigured = Boolean(initialConfig?.hasToken);

  const [editing, setEditing] = useState(!isConfigured);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nome, setNome] = useState(initialConfig?.nome ?? "Sofia");
  const [tom, setTom] = useState(initialConfig?.tom ?? "CONSULTIVO");
  const [servicos, setServicos] = useState((initialConfig?.servicos ?? []).join("\n"));
  const [objecoes, setObjecoes] = useState((initialConfig?.objecoes ?? []).join("\n"));
  const [horario, setHorario] = useState(initialConfig?.horario ?? "Segunda a sexta, 9h às 18h");
  const [followupEnabled, setFollowupEnabled] = useState(initialConfig?.followupEnabled ?? true);
  const [followupDelayHours, setFollowupDelayHours] = useState(initialConfig?.followupDelayHours ?? 24);
  const [followupMaxAttempts, setFollowupMaxAttempts] = useState(initialConfig?.followupMaxAttempts ?? 2);

  const [showTest, setShowTest] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  function splitLines(v: string) {
    return v.split("\n").map(s => s.trim()).filter(Boolean);
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ferramentas/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, tom,
          servicos: splitLines(servicos),
          objecoes: splitLines(objecoes),
          horario,
          followupEnabled,
          followupDelayHours,
          followupMaxAttempts,
        }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      setStep(1);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    const nextChat: ChatMsg[] = [...chat, { role: "user", content: message }];
    setChat(nextChat);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ferramentas/whatsapp/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: chat }),
      });
      const data = await res.json();
      setChat([...nextChat, { role: "assistant", content: data.reply ?? "—" }]);
    } catch {
      setChat([...nextChat, { role: "assistant", content: "Erro ao testar o agente." }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{nome} • tom {tom.toLowerCase()}</p>
            <button onClick={() => setEditing(true)} className="text-sm text-blue-400 hover:text-blue-300">Editar configurações</button>
          </div>
          <p className="text-sm text-gray-400">Instância conectada: <span className="text-gray-300">{initialConfig?.uazapiInstance || "—"}</span></p>
          {servicos && <p className="text-sm text-gray-400">Serviços: <span className="text-gray-300">{splitLines(servicos).join(", ")}</span></p>}
          <p className="text-sm text-gray-400">
            Follow-up: <span className="text-gray-300">
              {followupEnabled ? `a cada ${followupDelayHours}h, até ${followupMaxAttempts} tentativa${followupMaxAttempts === 1 ? "" : "s"}` : "desativado"}
            </span>
          </p>
        </div>

        <button
          onClick={() => setShowTest(s => !s)}
          className="text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          {showTest ? "Ocultar teste do agente" : "🧪 Testar agente"}
        </button>

        {showTest && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="h-64 overflow-y-auto space-y-2 bg-gray-950 rounded-xl p-3">
              {chat.length === 0 && <p className="text-xs text-gray-500">Envie uma mensagem como se fosse um cliente no WhatsApp.</p>}
              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-gray-500">digitando...</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendTest()}
                placeholder="Digite uma mensagem de teste..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
              <button onClick={handleSendTest} disabled={chatLoading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
      <div className="flex gap-2 text-xs">
        {[1, 2, 3].map(n => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-blue-500" : "bg-gray-800"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="font-semibold">1. Personalidade do agente</p>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Nome do agente</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">Tom de voz</label>
            <div className="grid grid-cols-3 gap-2">
              {TOM_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setTom(o.value)}
                  className={`text-left p-3 rounded-xl border text-sm ${tom === o.value ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
                >
                  <p className="font-medium">{o.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{o.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="font-semibold">2. Configuração comercial</p>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Serviços/produtos (um por linha)</label>
            <textarea value={servicos} onChange={e => setServicos(e.target.value)} rows={3} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Objeções comuns (uma por linha)</label>
            <textarea value={objecoes} onChange={e => setObjecoes(e.target.value)} rows={3} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Horário de atendimento</label>
            <input value={horario} onChange={e => setHorario(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="font-semibold">3. Follow-up automático</p>
          <p className="text-sm text-gray-400">Se o contato não responder, o agente manda uma mensagem de retomada sozinho, usando o contexto da conversa.</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={followupEnabled} onChange={e => setFollowupEnabled(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Ativar follow-up automático</span>
          </label>

          {followupEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Esperar (horas) sem resposta</label>
                <input
                  type="number" min={1} max={720} value={followupDelayHours}
                  onChange={e => setFollowupDelayHours(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Máximo de tentativas</label>
                <input
                  type="number" min={0} max={10} value={followupMaxAttempts}
                  onChange={e => setFollowupMaxAttempts(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">Ao salvar, criamos automaticamente a conexão do WhatsApp e mostramos um QR code para você escanear — sem precisar de nenhum painel externo.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between pt-2">
        <button
          onClick={() => (step === 1 ? isConfigured && setEditing(false) : setStep(step - 1))}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          {step === 1 ? (isConfigured ? "Cancelar" : "") : "← Voltar"}
        </button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2 text-sm font-medium">
            Continuar
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
            {saving ? "Criando conexão..." : "Salvar e conectar WhatsApp"}
          </button>
        )}
      </div>
    </div>
  );
}
