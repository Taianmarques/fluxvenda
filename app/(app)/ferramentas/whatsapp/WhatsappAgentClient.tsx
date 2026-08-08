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
  objetivo: string;
  fluxoAtendimento: string;
  comportamento: string;
  fluxoGatilhos: { gatilho: string; resposta: string }[];
  sdrMateriaisEnabled: boolean;
  followupEnabled: boolean;
  followupDelaysMinutes: number[];
  emojiEnabled: boolean;
  iaIgnoraAtribuidos: boolean;
  iaNiveisCarteiraExcluidos: string[];
  iaNumerosBloqueados: string[];
  iaPerfisExcluidos: string[];
  transferirAoPedirFoto: boolean;
  iaLeadAttendantId: string | null;
} | null;

type Attendant = { id: string; name: string; isManager: boolean };

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

type GatilhoRow = { gatilho: string; resposta: string };

function FluxoGatilhosEditor({
  rows, onAdd, onRemove, onUpdate,
}: {
  rows: GatilhoRow[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, row: Partial<GatilhoRow>) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Regra {i + 1}</span>
            {rows.length > 1 && (
              <button onClick={() => onRemove(i)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Quando (gatilho)</label>
            <input
              value={row.gatilho} onChange={e => onUpdate(i, { gatilho: e.target.value })}
              placeholder="Ex: cliente pergunta sobre prazo de entrega"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">A IA deve...</label>
            <input
              value={row.resposta} onChange={e => onUpdate(i, { resposta: e.target.value })}
              placeholder="Ex: informar que o prazo médio é 3 dias úteis e perguntar o CEP para confirmar"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      ))}
      {rows.length < 30 && (
        <button onClick={onAdd} className="text-sm text-blue-400 hover:text-blue-300">+ Adicionar regra</button>
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

const TOTAL_STEPS = 6;

const NIVEL_CARTEIRA_CHECKBOX_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PERDIDO", label: "Perdido" },
] as const;

const PERFIL_CHECKBOX_OPTIONS = [
  { value: "MARCENEIRO", label: "Marceneiro" },
  { value: "ARQUITETO", label: "Arquiteto" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "CONSUMIDOR_FINAL", label: "Consumidor final" },
] as const;

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

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
  const [objetivo, setObjetivo] = useState(initialConfig?.objetivo ?? "");
  const [fluxoAtendimento, setFluxoAtendimento] = useState(initialConfig?.fluxoAtendimento ?? "");
  const [comportamento, setComportamento] = useState(initialConfig?.comportamento ?? "");
  const [fluxoGatilhos, setFluxoGatilhos] = useState<GatilhoRow[]>(
    initialConfig?.fluxoGatilhos?.length ? initialConfig.fluxoGatilhos : [{ gatilho: "", resposta: "" }]
  );
  const [sdrMateriaisEnabled, setSdrMateriaisEnabled] = useState(initialConfig?.sdrMateriaisEnabled ?? false);
  const [followupEnabled, setFollowupEnabled] = useState(initialConfig?.followupEnabled ?? true);
  const [emojiEnabled, setEmojiEnabled] = useState(initialConfig?.emojiEnabled ?? false);
  const [followupDelays, setFollowupDelays] = useState<DelayRow[]>(
    (initialConfig?.followupDelaysMinutes ?? [1440, 1440]).map(minutesToRow)
  );

  // Quem a IA atende quando está ligada — critérios opcionais de exclusão
  const [iaIgnoraAtribuidos, setIaIgnoraAtribuidos] = useState(initialConfig?.iaIgnoraAtribuidos ?? false);
  const [iaNiveisCarteiraExcluidos, setIaNiveisCarteiraExcluidos] = useState<string[]>(initialConfig?.iaNiveisCarteiraExcluidos ?? []);
  const [iaPerfisExcluidos, setIaPerfisExcluidos] = useState<string[]>(initialConfig?.iaPerfisExcluidos ?? []);
  const [iaNumerosBloqueadosText, setIaNumerosBloqueadosText] = useState((initialConfig?.iaNumerosBloqueados ?? []).join("\n"));
  const [transferirAoPedirFoto, setTransferirAoPedirFoto] = useState(initialConfig?.transferirAoPedirFoto ?? false);
  const [iaLeadAttendantId, setIaLeadAttendantId] = useState(initialConfig?.iaLeadAttendantId ?? "");
  const [attendants, setAttendants] = useState<Attendant[]>([]);

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
  }, [agentId]);

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

  function addGatilhoRow() {
    setFluxoGatilhos([...fluxoGatilhos, { gatilho: "", resposta: "" }]);
  }
  function removeGatilhoRow(i: number) {
    setFluxoGatilhos(fluxoGatilhos.filter((_, idx) => idx !== i));
  }
  function updateGatilhoRow(i: number, row: Partial<GatilhoRow>) {
    setFluxoGatilhos(fluxoGatilhos.map((r, idx) => (idx === i ? { ...r, ...row } : r)));
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
          objetivo, fluxoAtendimento, comportamento,
          fluxoGatilhos: fluxoGatilhos.filter(r => r.gatilho.trim() && r.resposta.trim()),
          sdrMateriaisEnabled,
          servicos: splitLines(servicos),
          objecoes: splitLines(objecoes),
          horario,
          followupEnabled,
          followupDelaysMinutes: followupDelays.map(rowToMinutes),
          emojiEnabled,
          iaIgnoraAtribuidos, iaNiveisCarteiraExcluidos, iaPerfisExcluidos,
          iaNumerosBloqueados: splitLines(iaNumerosBloqueadosText),
          transferirAoPedirFoto, iaLeadAttendantId: iaLeadAttendantId || null,
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
  // Testar um modelo fine-tunado isolado (id da OpenAI) sem tocar na configuração do agente —
  // some ao recarregar a página, é só pra essa sessão de teste
  const [testModelId, setTestModelId] = useState("");

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
          objetivo, fluxoAtendimento, comportamento,
          fluxoGatilhos: fluxoGatilhos.filter(r => r.gatilho.trim() && r.resposta.trim()),
          sdrMateriaisEnabled,
          servicos: splitLines(servicos),
          objecoes: splitLines(objecoes),
          horario,
          followupEnabled,
          followupDelaysMinutes: followupDelays.map(rowToMinutes),
          emojiEnabled,
          iaIgnoraAtribuidos, iaNiveisCarteiraExcluidos, iaPerfisExcluidos,
          iaNumerosBloqueados: splitLines(iaNumerosBloqueadosText),
          transferirAoPedirFoto, iaLeadAttendantId: iaLeadAttendantId || null,
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
        body: JSON.stringify({ message, history: chat, modelId: testModelId.trim() || undefined }),
      });
      const data = await res.json();
      setChat([...nextChat, { role: "assistant", content: res.ok ? (data.reply ?? "—") : (data.error ?? "Erro ao testar o agente.") }]);
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
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Modelo fine-tunado pra testar (opcional — em branco usa o modelo padrão)
              </label>
              <input
                value={testModelId}
                onChange={e => setTestModelId(e.target.value)}
                placeholder="ft:gpt-4o-mini-2024-07-18:org::abc123"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600"
              />
              <p className="text-[11px] text-gray-600 mt-1">
                Só vale pra essa conversa de teste — não muda a configuração do agente nem afeta o atendimento real.
              </p>
            </div>
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
          <p className="font-semibold">4. Objetivo e comportamento</p>
          <p className="text-sm text-gray-400">Opcional — instruções diretas pro agente, além das informações da empresa. Deixe em branco pra usar só o padrão.</p>

          <div className="border border-gray-800 rounded-xl p-3 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sdrMateriaisEnabled} onChange={e => setSdrMateriaisEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar SDR de qualificação</span>
            </label>
            <p className="text-xs text-gray-500">
              A IA identifica o perfil do cliente (marceneiro, arquiteto, empresa ou consumidor final), o material procurado, especificações técnicas (cor, espessura, medidas, quantidade) e serviços adicionais (corte, fitamento) — depois cria a oportunidade no funil e transfere pro vendedor. Etapas garantidas por ferramentas, não só instrução de texto.
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Objetivo principal</label>
            <textarea
              value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={3}
              placeholder="Ex: Qualificar o cliente e agendar uma visita à loja para orçamento presencial."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Fluxo de atendimento</label>
            <textarea
              value={fluxoAtendimento} onChange={e => setFluxoAtendimento(e.target.value)} rows={4}
              placeholder={"Ex:\n1. Cumprimentar e perguntar o que o cliente procura\n2. Entender medidas/quantidade necessárias\n3. Informar preço e prazo de entrega\n4. Perguntar se quer fechar o pedido ou agendar retirada"}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Fluxo por gatilhos (opcional)</label>
            <p className="text-xs text-gray-500 mb-2">Regras específicas de “quando X acontece, aja assim” — a IA usa o contexto da conversa pra saber quando cada uma se aplica, não é busca exata de texto.</p>
            <FluxoGatilhosEditor rows={fluxoGatilhos} onAdd={addGatilhoRow} onRemove={removeGatilhoRow} onUpdate={updateGatilhoRow} />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Como se comportar</label>
            <textarea
              value={comportamento} onChange={e => setComportamento(e.target.value)} rows={3}
              placeholder="Ex: Nunca prometa desconto sem confirmar com o gestor. Nunca fale mal da concorrência. Sempre confirme o endereço de entrega antes de fechar o pedido."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <p className="font-semibold">5. Follow-up automático</p>
          <p className="text-sm text-gray-400">Se o contato não responder, o agente manda uma mensagem de retomada sozinho, usando o contexto da conversa.</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={followupEnabled} onChange={e => setFollowupEnabled(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Ativar follow-up automático</span>
          </label>

          {followupEnabled && (
            <FollowupDelaysEditor followupDelays={followupDelays} onAdd={addFollowupAttempt} onRemove={removeFollowupAttempt} onUpdate={updateFollowupAttempt} />
          )}
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <p className="font-semibold">6. Quem a IA atende</p>
          <p className="text-sm text-gray-400">
            Enquanto a IA estiver ligada, esses critérios decidem quais conversas ela responde automaticamente. Quando algum critério exclui uma conversa, a mensagem continua sendo salva normalmente (a IA &quot;escuta&quot; tudo) e a equipe é avisada — só não sai resposta automática.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={iaIgnoraAtribuidos} onChange={e => setIaIgnoraAtribuidos(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Não responder conversas que já têm um vendedor atribuído</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={transferirAoPedirFoto} onChange={e => setTransferirAoPedirFoto(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Transferir direto pra um atendente quando o cliente pedir foto/imagem</span>
          </label>
          <p className="text-xs text-gray-500 -mt-2">A IA não consegue enviar mídia — em vez de tentar contornar, ela já passa a conversa pra um humano assim que perceber o pedido.</p>

          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Vendedor que recebe os leads transferidos pela IA</label>
            <select
              value={iaLeadAttendantId}
              onChange={e => setIaLeadAttendantId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            >
              <option value="">Sem preferência (segue a distribuição padrão)</option>
              {attendants.map(a => <option key={a.id} value={a.id}>{a.name}{a.isManager ? " (gestor)" : ""}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Vale só pra conversas ainda sem atendente — quando a IA transfere (SDR, pedido de foto, perfil excluído), esse vendedor é definido automaticamente. Não rouba conversas que já têm alguém.</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Não responder estes níveis de carteira</label>
            <div className="flex flex-wrap gap-3">
              {NIVEL_CARTEIRA_CHECKBOX_OPTIONS.map(n => (
                <label key={n.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={iaNiveisCarteiraExcluidos.includes(n.value)}
                    onChange={() => setIaNiveisCarteiraExcluidos(prev => toggleInArray(prev, n.value))}
                    className="w-4 h-4"
                  />
                  {n.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Considera só o nível definido manualmente ou por importação — o calculado automaticamente (recorrência/ticket/recência) não entra aqui.</p>
          </div>

          {sdrMateriaisEnabled && (
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Não responder estes perfis de cliente</label>
              <div className="flex flex-wrap gap-3">
                {PERFIL_CHECKBOX_OPTIONS.map(p => (
                  <label key={p.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={iaPerfisExcluidos.includes(p.value)}
                      onChange={() => setIaPerfisExcluidos(prev => toggleInArray(prev, p.value))}
                      className="w-4 h-4"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">O perfil só é conhecido depois que o fluxo de pré-vendas identifica o cliente — a partir daí, se o perfil estiver marcado aqui, a conversa passa pra um atendente.</p>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Números que a IA nunca responde (um por linha, com DDD)</label>
            <textarea
              value={iaNumerosBloqueadosText}
              onChange={e => setIaNumerosBloqueadosText(e.target.value)}
              rows={3}
              placeholder={"84999990000\n11988887777"}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-600"
            />
          </div>

          <p className="text-xs text-gray-500">Ao salvar, você escolhe qual canal conectar: WhatsApp (via QR code) ou Instagram — e pode conectar os dois depois, na página de Canais.</p>
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
            {saving ? "Salvando..." : "Salvar agente"}
          </button>
        )}
      </div>
    </div>
  );
}
