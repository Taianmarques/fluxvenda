"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, ExternalLink, Copy, Check, Trash2, Sparkles } from "lucide-react";
import { GerarQuizIA } from "./GerarQuizIA";

type FormRow = { id: string; slug: string; title: string; active: boolean; submissionCount: number; createdAt: string };

export function FormulariosClient({ agentId, initialForms }: { agentId: string; initialForms: FormRow[] }) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("Oi! Responde rapidinho aqui embaixo que a gente já te chama no WhatsApp.");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [style, setStyle] = useState<"CHAT" | "TELAS">("CHAT");
  const [gerandoIA, setGerandoIA] = useState(false);

  async function handleCreate() {
    setError(null);
    if (!title.trim() || !headline.trim()) { setError("Preencha o título e a mensagem de abertura."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/formularios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), headline: headline.trim(), style }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; form?: { id: string } }));
      if (!res.ok) { setError(data.error ?? "Não foi possível criar."); return; }
      router.push(`/crm/${agentId}/formularios/${data.form.id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esse formulário e todas as respostas dele? O link deixa de funcionar.")) return;
    const res = await fetch(`/api/agentes/${agentId}/formularios/${id}`, { method: "DELETE" });
    if (res.ok) setForms(prev => prev.filter(f => f.id !== id));
  }

  function copyLink(f: FormRow) {
    navigator.clipboard.writeText(`${window.location.origin}/formulario/${f.slug}`).then(() => {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={22} /> Formulários</h1>
            <p className="text-gray-400 text-sm mt-1">
              Formulário em conversa ou quiz em telas pra captar leads (anúncio, bio, site). Ao preencher o WhatsApp, o lead já recebe a primeira mensagem do agente.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setGerandoIA(v => !v); setCreating(false); }}
            className="flex items-center gap-2 border border-blue-700/60 text-blue-300 hover:bg-blue-600/10 rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            <Sparkles size={15} /> Roteiro → quiz (IA)
          </button>
          <button
            onClick={() => { setCreating(v => !v); setGerandoIA(false); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex-shrink-0"
          >
            <Plus size={15} /> Novo formulário
          </button>
          </div>
        </div>

        {gerandoIA && (
          <GerarQuizIA
            endpoint={`/api/agentes/${agentId}/formularios`}
            extraBody={{ modo: "ia" }}
            onCreated={id => router.push(`/crm/${agentId}/formularios/${id}`)}
            onClose={() => setGerandoIA(false)}
          />
        )}

        {creating && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Tipo</label>
              <div className="grid sm:grid-cols-2 gap-2 mt-1">
                {([
                  { v: "CHAT", t: "Formulário em conversa", d: "Perguntas em balões, como um chat." },
                  { v: "TELAS", t: "Quiz em telas", d: "Uma tela por vez, com emoji/fotos nas opções, conteúdo, carregamento e oferta." },
                ] as const).map(o => (
                  <button
                    key={o.v} type="button" onClick={() => setStyle(o.v)}
                    className={`text-left rounded-xl border px-3 py-2.5 ${style === o.v ? "border-blue-600 bg-blue-600/10" : "border-gray-800 hover:border-gray-700"}`}
                  >
                    <p className="text-sm font-semibold">{o.t}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.d}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Título (uso interno)</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Anúncio Instagram — outubro"
                maxLength={120}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Mensagem de abertura</label>
              <textarea
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <p className="text-xs text-gray-500">Já vem com as perguntas Nome → WhatsApp. O link é gerado a partir do título e dá pra editar, junto com as perguntas, depois de criar.</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
                {saving ? "Criando..." : "Criar formulário"}
              </button>
              <button onClick={() => setCreating(false)} className="text-sm text-gray-400 hover:text-gray-300">Cancelar</button>
            </div>
          </div>
        )}

        {forms.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center text-gray-500">
            Nenhum formulário criado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {forms.map(f => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/crm/${agentId}/formularios/${f.id}`} className="font-medium hover:text-blue-400 truncate">{f.title}</Link>
                    {!f.active && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">inativo</span>}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">/formulario/{f.slug}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm text-gray-400">
                  <span>{f.submissionCount} {f.submissionCount === 1 ? "resposta" : "respostas"}</span>
                  <button onClick={() => copyLink(f)} className="p-2 rounded-lg hover:bg-gray-800" title="Copiar link">
                    {copiedId === f.id ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                  </button>
                  <a href={`/formulario/${f.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-gray-800" title="Abrir">
                    <ExternalLink size={15} />
                  </a>
                  <button onClick={() => handleDelete(f.id)} className="p-2 rounded-lg hover:bg-gray-800 text-red-400" title="Apagar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
