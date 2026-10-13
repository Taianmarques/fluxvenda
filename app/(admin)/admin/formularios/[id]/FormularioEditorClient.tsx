"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, Check, ExternalLink, Copy, Target, ChevronDown, ImagePlus, X, Send, Search, Loader2 } from "lucide-react";

import type { LeadFormQuestion, LeadFormUtm, QuizResult } from "@/lib/lead-form-shared";
import { MAX_OPCOES_ESCOLHA, DEFAULT_ACCENT } from "@/lib/lead-form-shared";
import type { FormStats } from "@/lib/lead-form-stats";
import { ExtrasPanel, TrackingLinks, StatsPanel, type FormExtras, type CrmFormOptions } from "./FormularioExtras";
import { QuizPanel, novoResultado } from "./FormularioQuiz";

export type { LeadFormQuestion };
export type FunnelStep = { minutos: number; mensagem: string };
type Submission = {
  id: string; nome: string | null; whatsapp: string | null; answers: Record<string, string>; inviteSentAt: string | null;
  inviteError: string | null; quizResult: string | null; utm: LeadFormUtm | null; createdAt: string;
};
type AgentOption = { id: string; nome: string; teamName: string; temWhatsapp: boolean };

const TYPE_LABEL: Record<LeadFormQuestion["type"], string> = { TEXTO: "Texto", WHATSAPP: "WhatsApp", EMAIL: "E-mail", NUMERO: "Número", ESCOLHA: "Escolha (botões)" };

// Editor de tempo (valor + unidade) pra cada passo do funil — mesmo padrão já usado no follow-up
// de etapa do pipeline (WhatsappPipeline.tsx), convertido pra/de minutos ao salvar.
type DelayUnit = "horas" | "dias";
type StepRow = { value: number; unit: DelayUnit; mensagem: string };
function stepToRow(s: FunnelStep): StepRow {
  return s.minutos % 1440 === 0
    ? { value: s.minutos / 1440, unit: "dias", mensagem: s.mensagem }
    : { value: Math.round(s.minutos / 60), unit: "horas", mensagem: s.mensagem };
}
function rowToStep(r: StepRow): FunnelStep {
  return { minutos: r.unit === "dias" ? r.value * 1440 : r.value * 60, mensagem: r.mensagem };
}

// Redimensiona pro navegador antes de mandar pro servidor — a foto vira base64 salvo direto no
// banco (mesmo padrão de Product.imagemBase64, não tem storage de blob nessa stack), então
// comprimir aqui evita payload gigante numa selfie de celular direto da câmera.
function resizeImageToBase64(file: File, maxSize = 200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas indisponível")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FormularioEditorClient({
  id, initialSlug, initialTitle, initialHeadline, initialActive, initialPixelId, initialAvatarUrl,
  initialAgentConfigId, initialAgentLabel, initialInviteMessage, initialDoneMessage, initialFunnelSteps, initialQuestions, submissions,
  crmAgentId, whatsappOk = true, initialExtras, crmOptions, stats, initialQuizResults,
}: {
  initialQuizResults: QuizResult[];
  id: string; initialSlug: string; initialTitle: string; initialHeadline: string; initialActive: boolean;
  initialPixelId: string; initialAvatarUrl: string | null;
  initialAgentConfigId: string | null; initialAgentLabel: string | null; initialInviteMessage: string; initialDoneMessage: string;
  initialFunnelSteps: FunnelStep[];
  // Definido quando o editor roda dentro do CRM (gestor editando o formulário do próprio agente):
  // troca a API, esconde a escolha de agente (é sempre o dele) e usa os textos padrão neutros.
  crmAgentId?: string;
  // false = o agente não tem WhatsApp via UazAPI conectado (único provedor que o formulário usa)
  whatsappOk?: boolean;
  initialExtras: FormExtras;
  crmOptions?: CrmFormOptions; // etiquetas e etapas do agente (só no CRM)
  stats?: FormStats | null;
  initialQuestions: LeadFormQuestion[]; submissions: Submission[];
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(initialTitle);
  const [headline, setHeadline] = useState(initialHeadline);
  const [active, setActive] = useState(initialActive);
  const [pixelId, setPixelId] = useState(initialPixelId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [questions, setQuestions] = useState<LeadFormQuestion[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Roteamento do lead: pra qual agente mandar o convite, e com qual mensagem de abertura
  const [agentConfigId, setAgentConfigId] = useState<string | null>(initialAgentConfigId);
  const [agentLabel, setAgentLabel] = useState<string | null>(initialAgentLabel);
  const [inviteMessage, setInviteMessage] = useState(initialInviteMessage);
  const [doneMessage, setDoneMessage] = useState(initialDoneMessage);
  const [extras, setExtras] = useState<FormExtras>({ ...initialExtras, accentColor: initialExtras.accentColor || DEFAULT_ACCENT });
  // Opções das perguntas de escolha: uma por linha (texto cru, pra digitar Enter sem perder a linha em branco)
  const [optionsText, setOptionsText] = useState<Record<string, string>>(
    Object.fromEntries(initialQuestions.filter(q => q.type === "ESCOLHA").map(q => [q.key, (q.options ?? []).join("\n")])),
  );
  // Quiz: desligar só esconde — os resultados digitados voltam se religar antes de salvar
  const [quizOn, setQuizOn] = useState(initialQuizResults.length > 0);
  const [quizResults, setQuizResults] = useState<QuizResult[]>(initialQuizResults);
  function toggleQuiz(on: boolean) {
    setQuizOn(on);
    if (on && quizResults.length === 0) setQuizResults(prev => { const a = novoResultado(prev); return [a, novoResultado([a])]; });
    setSaved(false);
  }
  function setOptionResult(i: number, option: string, resultKey: string) {
    const q = questions[i];
    const map = { ...(q.optionResults ?? {}) };
    if (resultKey) map[option] = resultKey; else delete map[option];
    updateQuestion(i, { optionResults: map });
  }

  function updateExtras(patch: Partial<FormExtras>) {
    setExtras(prev => ({ ...prev, ...patch }));
    setSaved(false);
  }
  const exportHref = crmAgentId ? `/api/agentes/${crmAgentId}/formularios/${id}/exportar` : `/api/admin/formularios/${id}/exportar`;
  const isCrm = Boolean(crmAgentId);
  const apiUrl = isCrm ? `/api/agentes/${crmAgentId}/formularios/${id}` : `/api/admin/formularios/${id}`;
  const backHref = isCrm ? `/crm/${crmAgentId}/formularios` : "/admin/formularios";
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");
  const [agentOptions, setAgentOptions] = useState<AgentOption[] | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  async function searchAgents(q: string) {
    setLoadingAgents(true);
    try {
      const res = await fetch(`/api/admin/agentes?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAgentOptions(res.ok ? (data.agents ?? []) : []);
    } catch {
      setAgentOptions([]);
    } finally {
      setLoadingAgents(false);
    }
  }

  function openAgentPicker() {
    setShowAgentPicker(true);
    if (agentOptions === null) searchAgents("");
  }

  function pickAgent(a: AgentOption) {
    setAgentConfigId(a.id);
    setAgentLabel(`${a.nome} — ${a.teamName}`);
    setShowAgentPicker(false);
    setSaved(false);
  }

  // Funil após o convite: sequência de mensagens automáticas, mesmo estilo do funil do teste
  // grátis — mas editável por formulário (tempo + texto de cada passo, ver lib/lead-form-funnel.ts)
  const [funnelRows, setFunnelRows] = useState<StepRow[]>(initialFunnelSteps.map(stepToRow));

  function addFunnelStep() {
    const last = funnelRows[funnelRows.length - 1];
    setFunnelRows(prev => [...prev, { value: last ? last.value : 1, unit: last ? last.unit : "dias", mensagem: "" }]);
    setSaved(false);
  }
  function updateFunnelStep(i: number, patch: Partial<StepRow>) {
    setFunnelRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }
  function removeFunnelStep(i: number) {
    setFunnelRows(prev => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToBase64(file);
      setAvatarUrl(dataUrl);
      setSaved(false);
    } catch {
      setError("Não deu pra processar essa imagem.");
    }
  }

  const questionLabel = (key: string) => initialQuestions.find(q => q.key === key)?.label ?? key;

  function updateQuestion(i: number, patch: Partial<LeadFormQuestion>) {
    setQuestions(prev => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
    setSaved(false);
  }

  function addQuestion() {
    setQuestions(prev => {
      let n = prev.length + 1;
      while (prev.some(q => q.key === `campo${n}`)) n++;
      return [...prev, { key: `campo${n}`, label: "", type: "TEXTO" }];
    });
    setSaved(false);
  }

  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, title, headline, active, pixelId: pixelId.trim() || null, avatarUrl,
          // Só guarda ligações de opção que ainda existem e apontam pra um resultado que existe
          questions: questions.map(q => {
            const { optionResults, ...base } = q;
            if (!quizOn || q.type !== "ESCOLHA" || !optionResults) return base;
            const validas = Object.fromEntries(Object.entries(optionResults).filter(([opt, key]) =>
              (q.options ?? []).includes(opt) && quizResults.some(r => r.key === key)));
            return Object.keys(validas).length ? { ...base, optionResults: validas } : base;
          }),
          quizResults: quizOn ? quizResults : null,
          ...(isCrm ? { etiquetaId: extras.etiquetaId, pipelineStageId: extras.pipelineStageId } : { agentConfigId }),
          inviteMessage: inviteMessage.trim() || null, doneMessage: doneMessage.trim() || null,
          accentColor: extras.accentColor, coverUrl: extras.coverUrl, ctaLabel: extras.ctaLabel, ctaUrl: extras.ctaUrl,
          waNumber: extras.waNumber, waButtonText: extras.waButtonText, consentText: extras.consentText,
          conversionUrl: extras.conversionUrl, conversionEvent: extras.conversionEvent,
          funnelSteps: funnelRows.filter(r => r.mensagem.trim()).map(rowToStep),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar."); return; }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/formulario/${slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1.5">
        <ArrowLeft size={14} /> Formulários
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); }}
            className="text-xl font-bold bg-transparent focus:outline-none flex-1 min-w-[200px]"
          />
          <label className="flex items-center gap-2 text-sm text-gray-400 flex-shrink-0">
            <input type="checkbox" checked={active} onChange={e => { setActive(e.target.checked); setSaved(false); }} />
            Ativo
          </label>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">/formulario/</span>
          <input
            value={slug}
            onChange={e => { setSlug(e.target.value); setSaved(false); }}
            className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 font-mono flex-1 focus:outline-none focus:border-blue-600"
          />
          <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-gray-800 flex-shrink-0" title="Copiar link">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <a href={`/formulario/${slug}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-gray-800 flex-shrink-0" title="Abrir">
            <ExternalLink size={14} />
          </a>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Mensagem de abertura</label>
          <textarea
            value={headline}
            onChange={e => { setHeadline(e.target.value); setSaved(false); }}
            rows={3}
            className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Foto de quem &quot;conversa&quot; (opcional)</label>
          <div className="flex items-center gap-3 mt-1.5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-800" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-950 border border-dashed border-gray-700 flex items-center justify-center text-gray-600">
                <ImagePlus size={18} />
              </div>
            )}
            <label className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400 cursor-pointer">
              {avatarUrl ? "Trocar foto" : "Enviar foto"}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            {avatarUrl && (
              <button onClick={() => { setAvatarUrl(null); setSaved(false); }} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400" title="Remover">
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Aparece ao lado de cada mensagem do bot na conversa — dá o ar de atendimento humano em vez de formulário.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Target size={12} /> Pixel do Facebook (opcional)</label>
          <input
            value={pixelId}
            onChange={e => { setPixelId(e.target.value.replace(/\D/g, "")); setSaved(false); }}
            placeholder="Ex: 1234567890123456"
            inputMode="numeric"
            className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Cola aqui o ID do pixel (Gerenciador de Eventos do Meta). Dispara <span className="font-mono">PageView</span> ao abrir,{" "}
            <span className="font-mono">Lead</span> quando responde o WhatsApp e <span className="font-mono">CompleteRegistration</span> ao terminar o formulário.
          </p>
        </div>

        <ExtrasPanel value={extras} onChange={updateExtras} isCrm={isCrm} crmOptions={crmOptions} onError={setError} pixelId={pixelId} />

        <TrackingLinks slug={slug} />

        <div className="border border-gray-800 rounded-xl p-4 space-y-3">
          {isCrm && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Send size={12} /> Primeira mensagem no WhatsApp</label>
              <p className="text-xs text-gray-500 mt-1">
                Assim que o lead responde a pergunta de WhatsApp, o agente manda a primeira mensagem. Quem responder cai na caixa de Mensagens e a IA atende normalmente.
              </p>
              {!whatsappOk && (
                <p className="text-xs text-amber-400 mt-2">
                  Esse agente não tem um WhatsApp conectado via UazAPI — o formulário guarda as respostas, mas não consegue mandar a mensagem. Conecte o número em Canais.
                </p>
              )}
            </div>
          )}
          {!isCrm && (<>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Send size={12} /> Pra qual agente mandar o lead</label>
            <p className="text-xs text-gray-500 mt-1">
              Quem responder o WhatsApp cai no atendimento normal desse agente (system prompt, pipeline, follow-ups próprios) — é isso que muda o &quot;funil&quot; de cada formulário.
            </p>
          </div>

          {agentConfigId && agentLabel ? (
            <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2">
              <span className="text-sm flex-1 min-w-0 truncate">{agentLabel}</span>
              <button type="button" onClick={openAgentPicker} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Trocar</button>
              <button
                type="button"
                onClick={() => { setAgentConfigId(null); setAgentLabel(null); setSaved(false); }}
                className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0"
              >
                Usar padrão FluxVenda
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAgentPicker}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 border border-dashed border-gray-700 hover:border-blue-700 rounded-xl px-3 py-2 transition-colors"
            >
              <Search size={13} /> Padrão (agente interno FluxVenda) — clique pra escolher outro
            </button>
          )}

          {showAgentPicker && (
            <div className="border border-gray-800 rounded-xl p-3 bg-gray-950/60 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={agentQuery}
                  onChange={e => { setAgentQuery(e.target.value); searchAgents(e.target.value); }}
                  placeholder="Buscar por nome do agente ou empresa..."
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600"
                />
                <button type="button" onClick={() => setShowAgentPicker(false)} className="text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={14} /></button>
              </div>
              {loadingAgents && <p className="text-xs text-gray-500 flex items-center gap-1.5 py-2"><Loader2 size={12} className="animate-spin" /> Buscando...</p>}
              {!loadingAgents && agentOptions?.length === 0 && <p className="text-xs text-gray-500 py-2">Nenhum agente encontrado.</p>}
              {!loadingAgents && agentOptions && agentOptions.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {agentOptions.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pickAgent(a)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-sm truncate">{a.nome} <span className="text-gray-500">— {a.teamName}</span></span>
                      {!a.temWhatsapp && <span className="text-[10px] text-amber-400 flex-shrink-0">sem WhatsApp</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </>)}

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Mensagem de abertura no WhatsApp (opcional)</label>
            <textarea
              value={inviteMessage}
              onChange={e => { setInviteMessage(e.target.value); setSaved(false); }}
              rows={3}
              maxLength={1000}
              placeholder={isCrm
                ? "Deixe vazio pra usar uma saudação simples (\"Oi, {{nome}}! Recebemos o seu cadastro...\"). Use {{nome}} pra interpolar o primeiro nome do lead."
                : "Deixe vazio pra usar o convite padrão de teste grátis da FluxVenda. Use {{nome}} pra interpolar o primeiro nome do lead."}
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Mensagem final na tela (opcional)</label>
            <textarea
              value={doneMessage}
              onChange={e => { setDoneMessage(e.target.value); setSaved(false); }}
              rows={2}
              maxLength={1000}
              placeholder={isCrm
                ? "Deixe vazio pra usar: \"Prontinho! Recebemos seus dados e já te chamamos no seu WhatsApp.\""
                : "Deixe vazio pra usar o texto padrão do teste grátis da FluxVenda."}
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <p className="text-xs text-gray-500 mt-1">Aparece pro lead quando ele termina de responder o formulário.</p>
          </div>
        </div>

        <div className="border border-gray-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Funil após o convite (opcional)</label>
            <p className="text-xs text-gray-500 mt-1">
              Sequência de mensagens disparadas automaticamente depois do convite, mesmo estilo do funil do teste grátis — mas só desse formulário. Pausa sozinha se o lead responder.
            </p>
          </div>

          {funnelRows.map((row, i) => (
            <div key={i} className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{i === 0 ? "1º passo, +" : `${i + 1}º passo, +`}</span>
                <input
                  type="number" min={1} value={row.value}
                  onChange={e => updateFunnelStep(i, { value: Math.max(1, Number(e.target.value)) })}
                  className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-600"
                />
                <select
                  value={row.unit}
                  onChange={e => updateFunnelStep(i, { unit: e.target.value as DelayUnit })}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-600"
                >
                  <option value="horas">horas</option>
                  <option value="dias">dias</option>
                </select>
                <span className="text-xs text-gray-500">após o convite</span>
                <button type="button" onClick={() => removeFunnelStep(i)} className="ml-auto p-1.5 rounded-lg hover:bg-gray-800 text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
              <textarea
                value={row.mensagem}
                onChange={e => updateFunnelStep(i, { mensagem: e.target.value })}
                rows={2}
                maxLength={1000}
                placeholder="Texto da mensagem — use {{nome}} pra interpolar o primeiro nome do lead."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          ))}

          <button type="button" onClick={addFunnelStep} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
            <Plus size={14} /> Adicionar passo
          </button>
        </div>

        <QuizPanel
          enabled={quizOn} onToggle={toggleQuiz} results={quizResults}
          onChange={rs => { setQuizResults(rs); setSaved(false); }} isCrm={isCrm} crmOptions={crmOptions}
        />

        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Perguntas, em ordem</label>
          {questions.map((q, i) => (
            <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-5 flex-shrink-0">{i + 1}.</span>
              <input
                value={q.label}
                onChange={e => updateQuestion(i, { label: e.target.value })}
                placeholder="Texto da pergunta"
                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
              <select
                value={q.type}
                onChange={e => updateQuestion(i, { type: e.target.value as LeadFormQuestion["type"] })}
                className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-2 text-sm flex-shrink-0"
              >
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => removeQuestion(i)} className="p-2 rounded-lg hover:bg-gray-800 text-red-400 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
            {q.type === "ESCOLHA" && (
              <div className="pl-7">
                <textarea
                  value={optionsText[q.key] ?? (q.options ?? []).join("\n")}
                  onChange={e => {
                    const text = e.target.value;
                    setOptionsText(prev => ({ ...prev, [q.key]: text }));
                    updateQuestion(i, { options: text.split("\n").map(o => o.trim()).filter(Boolean).slice(0, MAX_OPCOES_ESCOLHA) });
                  }}
                  rows={3}
                  placeholder={"Uma opção por linha (2 a " + MAX_OPCOES_ESCOLHA + ")\nComeçando\nJá vendo\nEscalando"}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">O lead escolhe tocando num botão — a resposta já serve pra separar quem é quem.</p>
                {quizOn && (q.options ?? []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] text-gray-500">Cada opção conta para:</p>
                    {(q.options ?? []).map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 flex-1 min-w-0 truncate">{opt}</span>
                        <select
                          value={q.optionResults?.[opt] ?? ""}
                          onChange={e => setOptionResult(i, opt, e.target.value)}
                          className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs w-44 flex-shrink-0"
                        >
                          <option value="">Não pontua</option>
                          {quizResults.map((r, ri) => <option key={r.key} value={r.key}>{r.titulo.trim() || `Resultado ${ri + 1}`}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          ))}
          <button onClick={addQuestion} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mt-1">
            <Plus size={14} /> Adicionar pergunta
          </button>
          <p className="text-xs text-gray-500 pt-1">
            A pergunta do tipo <span className="font-semibold text-gray-400">WhatsApp</span> é a que dispara o convite automático assim que respondida.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
          </button>
          {saved && <span className="flex items-center gap-1 text-sm text-green-400"><Check size={14} /> Salvo</span>}
        </div>
      </div>

      {stats && <StatsPanel stats={stats} exportHref={exportHref} />}

      <div>
        <h2 className="text-lg font-bold mb-3">Respostas ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-8 text-center text-gray-500 text-sm">
            Ninguém respondeu ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map(s => {
              const isOpen = expandedId === s.id;
              const answerEntries = Object.entries(s.answers ?? {});
              return (
                <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                    className="w-full p-4 flex items-center justify-between gap-4 flex-wrap text-left hover:bg-gray-800/40"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <ChevronDown size={14} className={`text-gray-500 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.nome ?? "—"}</p>
                        <p className="text-xs text-gray-500 font-mono">{s.whatsapp ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span>{new Date(s.createdAt).toLocaleString("pt-BR")}</span>
                      {s.quizResult && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800/50">
                          {quizResults.find(r => r.key === s.quizResult)?.titulo || s.quizResult}
                        </span>
                      )}
                      {s.utm?.source && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300" title={[s.utm.medium, s.utm.campaign, s.utm.content].filter(Boolean).join(" · ") || undefined}>
                          {s.utm.source}
                        </span>
                      )}
                      {s.inviteSentAt ? (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">convite enviado</span>
                      ) : s.inviteError ? (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800/50">envio falhou</span>
                      ) : (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">sem convite</span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-950/40">
                      {s.inviteError && !s.inviteSentAt && (
                        <p className="text-xs text-red-300 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">Por que a mensagem não saiu: {s.inviteError}</p>
                      )}
                      {answerEntries.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma resposta registrada.</p>
                      ) : (
                        answerEntries.map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs text-gray-500">{questionLabel(key)}</p>
                            <p className="text-sm mt-0.5">{value || "—"}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
