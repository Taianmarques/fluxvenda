"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Sparkles } from "lucide-react";
import { AGENT_WIZARD_QUESTIONS, DEFAULT_WIZARD_QUESTIONS } from "@/lib/agent-wizard-questions";

type InitialConfig = {
  nome: string;
  tom: string;
  servicos: string[];
  objecoes: string[];
  horario: string;
  uazapiInstance: string | null;
  isConfigured: boolean;
  descricaoEmpresa: string;
  precos: string;
  enderecoContato: string;
  followupEnabled: boolean;
  followupDelaysMinutes: number[];
  emojiEnabled: boolean;
} | null;

type DelayUnit = "horas" | "minutos";
type DelayRow = { value: number; unit: DelayUnit };

function minutesToRow(minutes: number): DelayRow {
  return minutes % 60 === 0 ? { value: minutes / 60, unit: "horas" } : { value: minutes, unit: "minutos" };
}

function rowToMinutes(row: DelayRow): number {
  return row.unit === "horas" ? row.value * 60 : row.value;
}

function formatDelay(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}min`;
}

function FollowupDelaysEditor({
  followupDelays, onAdd, onRemove, onUpdate,
}: {
  followupDelays: DelayRow[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, row: Partial<DelayRow>) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400 block">Tentativas (cada uma pode esperar um tempo diferente)</label>
      {followupDelays.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0">
            {i === 0 ? "1ª tentativa" : `${i + 1}ª, +`}
          </span>
          <input
            type="number" min={1} max={row.unit === "horas" ? 720 : 1440} value={row.value}
            onChange={e => onUpdate(i, { value: Math.max(1, Number(e.target.value)) })}
            className="w-24 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
          <select
            value={row.unit} onChange={e => onUpdate(i, { unit: e.target.value as DelayUnit })}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          >
            <option value="horas">horas</option>
            <option value="minutos">minutos</option>
          </select>
          <span className="text-xs text-gray-500">sem resposta</span>
          {followupDelays.length > 1 && (
            <button onClick={() => onRemove(i)} className="text-xs text-red-400 hover:text-red-300 ml-auto">Remover</button>
          )}
        </div>
      ))}
      {followupDelays.length < 10 && (
        <button onClick={onAdd} className="text-sm text-blue-400 hover:text-blue-300">+ Adicionar tentativa</button>
      )}
    </div>
  );
}

const TOM_OPTIONS = [
  { value: "FORMAL", label: "Formal", description: "Protocolar, direto ao ponto" },
  { value: "PROXIMO", label: "Próximo", description: "Descontraído e caloroso" },
  { value: "CONSULTIVO", label: "Consultivo", description: "Atencioso, entende antes de oferecer" },
];

type ChatMsg = { role: "user" | "assistant"; content: string };

const TOTAL_STEPS = 4;

export function WhatsappAgentClient({
  agentId, segmento, initialConfig,
}: {
  agentId: string;
  segmento?: { segmento: string; subsegmento: string };
  initialConfig: InitialConfig;
}) {
  const router = useRouter();
  const isConfigured = Boolean(initialConfig?.isConfigured);
  const q = AGENT_WIZARD_QUESTIONS[segmento?.segmento ?? ""] ?? DEFAULT_WIZARD_QUESTIONS;

  const [editing, setEditing] = useState(!isConfigured);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const autoSuggested = useRef(false);

  const [nome, setNome] = useState(initialConfig?.nome ?? "Sofia");
  const [tom, setTom] = useState(initialConfig?.tom ?? "CONSULTIVO");
  const [descricaoEmpresa, setDescricaoEmpresa] = useState(initialConfig?.descricaoEmpresa ?? "");
  const [enderecoContato, setEnderecoContato] = useState(initialConfig?.enderecoContato ?? "");
  const [servicos, setServicos] = useState((initialConfig?.servicos ?? []).join("\n"));
  const [precos, setPrecos] = useState(initialConfig?.precos ?? "");
  const [objecoes, setObjecoes] = useState((initialConfig?.objecoes ?? []).join("\n"));
  const [horario, setHorario] = useState(initialConfig?.horario ?? q.horarioDefault);
  const [followupEnabled, setFollowupEnabled] = useState(initialConfig?.followupEnabled ?? true);
  const [emojiEnabled, setEmojiEnabled] = useState(initialConfig?.emojiEnabled ?? false);
  const [followupDelays, setFollowupDelays] = useState<DelayRow[]>(
    (initialConfig?.followupDelaysMinutes ?? [1440, 1440]).map(minutesToRow)
  );

  function addFollowupAttempt() {
    const last = followupDelays[followupDelays.length - 1] ?? { value: 24, unit: "horas" as DelayUnit };
    setFollowupDelays([...followupDelays, { ...last }]);
  }
  function removeFollowupAttempt(i: number) {
    setFollowupDelays(followupDelays.filter((_, idx) => idx !== i));
  }
  function updateFollowupAttempt(i: number, row: Partial<DelayRow>) {
    setFollowupDelays(followupDelays.map((r, idx) => (idx === i ? { ...r, ...row } : r)));
  }

  const [showQuickFollowup, setShowQuickFollowup] = useState(false);
  const [savingQuickFollowup, setSavingQuickFollowup] = useState(false);

  function cancelQuickFollowup() {
    setFollowupEnabled(initialConfig?.followupEnabled ?? true);
    setFollowupDelays((initialConfig?.followupDelaysMinutes ?? [1440, 1440]).map(minutesToRow));
    setShowQuickFollowup(false);
  }

  async function handleSaveQuickFollowup() {
    setSavingQuickFollowup(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, tom,
          descricaoEmpresa, enderecoContato, precos,
          servicos: splitLines(servicos),
          objecoes: splitLines(objecoes),
          horario,
          followupEnabled,
          followupDelaysMinutes: followupDelays.map(rowToMinutes),
          emojiEnabled,
        }),
      });
      if (!res.ok) throw new Error();
      setShowQuickFollowup(false);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSavingQuickFollowup(false);
    }
  }

  const [showTest, setShowTest] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  function splitLines(v: string) {
    return v.split("\n").map(s => s.trim()).filter(Boolean);
  }

  async function handleSuggest() {
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/sugestao`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTom(data.tom);
      setServicos(data.servicos.join("\n"));
      setObjecoes(data.objecoes.join("\n"));
      setHorario(data.horario);
    } catch {
      setError("Não foi possível gerar sugestões agora. Tente novamente.");
    } finally {
      setSuggesting(false);
    }
  }

  // Na primeira vez que o usuário abre a config de um agente novo de um setor conhecido,
  // já sugere o preenchimento sozinho — sem precisar clicar em "Sugerir com IA".
  useEffect(() => {
    if (autoSuggested.current) return;
    if (!editing || !segmento?.segmento) return;
    if (servicos.trim() || objecoes.trim()) return;
    autoSuggested.current = true;
    handleSuggest();
  }, [editing]);

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, tom,
          descricaoEmpresa, enderecoContato, precos,
          servicos: splitLines(servicos),
          objecoes: splitLines(objecoes),
          horario,
          followupEnabled,
          followupDelaysMinutes: followupDelays.map(rowToMinutes),
          emojiEnabled,
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
      const res = await fetch(`/api/agentes/${agentId}/testar`, {
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
            <p className="font-semibold">{nome} • tom {tom.toLowerCase()} • {emojiEnabled ? "com emojis" : "sem emojis"}</p>
            <button onClick={() => setEditing(true)} className="text-sm text-blue-400 hover:text-blue-300">Editar configurações</button>
          </div>
          <p className="text-sm text-gray-400">Instância conectada: <span className="text-gray-300">{initialConfig?.uazapiInstance || "—"}</span></p>
          {descricaoEmpresa && <p className="text-sm text-gray-400">Sobre a empresa: <span className="text-gray-300">{descricaoEmpresa}</span></p>}
          {servicos && <p className="text-sm text-gray-400">Serviços: <span className="text-gray-300">{splitLines(servicos).join(", ")}</span></p>}
          {precos && <p className="text-sm text-gray-400">Preços: <span className="text-gray-300">{precos}</span></p>}
          {enderecoContato && <p className="text-sm text-gray-400">Endereço/contato: <span className="text-gray-300">{enderecoContato}</span></p>}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-400">
              Follow-up: <span className="text-gray-300">
                {followupEnabled
                  ? `${followupDelays.length} tentativa${followupDelays.length === 1 ? "" : "s"} (${followupDelays.map(rowToMinutes).map(formatDelay).join(" → ")})`
                  : "desativado"}
              </span>
            </p>
            {!showQuickFollowup && (
              <button onClick={() => setShowQuickFollowup(true)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Editar tempos</button>
            )}
          </div>

          {showQuickFollowup && (
            <div className="border-t border-gray-800 pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={followupEnabled} onChange={e => setFollowupEnabled(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Ativar follow-up automático</span>
              </label>
              {followupEnabled && (
                <FollowupDelaysEditor followupDelays={followupDelays} onAdd={addFollowupAttempt} onRemove={removeFollowupAttempt} onUpdate={updateFollowupAttempt} />
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleSaveQuickFollowup} disabled={savingQuickFollowup} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
                  {savingQuickFollowup ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={cancelQuickFollowup} className="text-sm text-gray-400 hover:text-gray-200">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowTest(s => !s)}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
        >
          {showTest ? "Ocultar teste do agente" : <><FlaskConical size={14} /> Testar agente</>}
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
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-blue-500" : "bg-gray-800"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">1. Personalidade do agente</p>
            {segmento?.segmento && (
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
              >
                <Sparkles size={13} /> {suggesting ? "Gerando sugestões..." : "Sugerir com IA"}
              </button>
            )}
          </div>
          {segmento?.segmento && (
            <p className="text-xs text-gray-500">
              Preenche tom, serviços, objeções e horário com um ponto de partida típico de {segmento.segmento}
              {segmento.subsegmento && ` > ${segmento.subsegmento}`} — revise tudo antes de salvar.
            </p>
          )}
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

          <div>
            <label className="text-sm text-gray-400 block mb-2">Emojis nas respostas</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEmojiEnabled(false)}
                className={`text-left p-3 rounded-xl border text-sm ${!emojiEnabled ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
              >
                <p className="font-medium">Sem emojis</p>
                <p className="text-xs text-gray-500 mt-0.5">Texto limpo, postura profissional</p>
              </button>
              <button
                onClick={() => setEmojiEnabled(true)}
                className={`text-left p-3 rounded-xl border text-sm ${emojiEnabled ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"}`}
              >
                <p className="font-medium">Com emojis</p>
                <p className="text-xs text-gray-500 mt-0.5">Tom mais amigável e expressivo</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="font-semibold">2. Sobre a empresa</p>
          <p className="text-sm text-gray-400">Quanto mais detalhes você der aqui, mais o agente vai saber responder sem inventar nada.</p>
          <div>
            <label className="text-sm text-gray-400 block mb-1">{q.descricaoEmpresaLabel}</label>
            <textarea
              value={descricaoEmpresa} onChange={e => setDescricaoEmpresa(e.target.value)} rows={4}
              placeholder={q.descricaoEmpresaPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Endereço, site e redes sociais</label>
            <textarea
              value={enderecoContato} onChange={e => setEnderecoContato(e.target.value)} rows={3}
              placeholder="Endereço físico, site, Instagram, outros canais de atendimento..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="font-semibold">3. Configuração comercial</p>
          <div>
            <label className="text-sm text-gray-400 block mb-1">{q.servicosLabel}</label>
            <textarea
              value={servicos} onChange={e => setServicos(e.target.value)} rows={3}
              placeholder={q.servicosPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">{q.precosLabel}</label>
            <textarea
              value={precos} onChange={e => setPrecos(e.target.value)} rows={3}
              placeholder={q.precosPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">{q.objecoesLabel}</label>
            <textarea
              value={objecoes} onChange={e => setObjecoes(e.target.value)} rows={3}
              placeholder={q.objecoesPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Horário de atendimento</label>
            <input value={horario} onChange={e => setHorario(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="font-semibold">4. Follow-up automático</p>
          <p className="text-sm text-gray-400">Se o contato não responder, o agente manda uma mensagem de retomada sozinho, usando o contexto da conversa.</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={followupEnabled} onChange={e => setFollowupEnabled(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Ativar follow-up automático</span>
          </label>

          {followupEnabled && (
            <FollowupDelaysEditor followupDelays={followupDelays} onAdd={addFollowupAttempt} onRemove={removeFollowupAttempt} onUpdate={updateFollowupAttempt} />
          )}

          <p className="text-xs text-gray-500">Ao salvar, criamos automaticamente a conexão do WhatsApp e mostramos um QR code para você escanear — sem precisar de nenhum painel externo.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between pt-2">
        <button
          onClick={() => (step === 1 ? isConfigured && setEditing(false) : setStep(step - 1))}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          {step === 1 ? (isConfigured ? "Cancelar" : "") : <><ArrowLeft size={14} /> Voltar</>}
        </button>
        {step < TOTAL_STEPS ? (
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
