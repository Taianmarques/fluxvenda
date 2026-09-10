"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, Check, ExternalLink, Copy, Target, ChevronDown, ImagePlus, X } from "lucide-react";

export type LeadFormQuestion = { key: string; label: string; type: "TEXTO" | "WHATSAPP" | "EMAIL" | "NUMERO" };
type Submission = { id: string; nome: string | null; whatsapp: string | null; answers: Record<string, string>; inviteSentAt: string | null; createdAt: string };

const TYPE_LABEL: Record<LeadFormQuestion["type"], string> = { TEXTO: "Texto", WHATSAPP: "WhatsApp", EMAIL: "E-mail", NUMERO: "Número" };

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
  id, initialSlug, initialTitle, initialHeadline, initialActive, initialPixelId, initialAvatarUrl, initialQuestions, submissions,
}: {
  id: string; initialSlug: string; initialTitle: string; initialHeadline: string; initialActive: boolean;
  initialPixelId: string; initialAvatarUrl: string | null; initialQuestions: LeadFormQuestion[]; submissions: Submission[];
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
    setQuestions(prev => [...prev, { key: `campo${prev.length + 1}`, label: "", type: "TEXTO" }]);
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
      const res = await fetch(`/api/admin/formularios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, headline, active, questions, pixelId: pixelId.trim() || null, avatarUrl }),
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
      <Link href="/admin/formularios" className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1.5">
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
          <label className="text-xs text-gray-500 uppercase tracking-wide">Foto de quem "conversa" (opcional)</label>
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

        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Perguntas, em ordem</label>
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
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
                      {s.inviteSentAt ? (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">convite enviado</span>
                      ) : (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">sem convite</span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-950/40">
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
