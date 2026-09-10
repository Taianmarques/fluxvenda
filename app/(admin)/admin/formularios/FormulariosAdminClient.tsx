"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, ExternalLink, Copy, Check, Trash2 } from "lucide-react";

type FormRow = { id: string; slug: string; title: string; active: boolean; submissionCount: number; createdAt: string };

const DEFAULT_QUESTIONS = [
  { key: "nome", label: "Então bora começar! Qual seu nome?", type: "TEXTO" as const },
  { key: "whatsapp", label: "E qual o seu WhatsApp com DDD?", type: "WHATSAPP" as const },
];

export function FormulariosAdminClient({ initialForms }: { initialForms: FormRow[] }) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState(
    "Empresas que aplicam IA da forma certa estão reduzindo custos e aumentando receita sem aumentar time. Quer descobrir como?"
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function slugify(v: string) {
    return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleCreate() {
    setError(null);
    if (!title.trim() || !slug.trim() || !headline.trim()) { setError("Preenche todos os campos."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/formularios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), title: title.trim(), headline: headline.trim(), questions: DEFAULT_QUESTIONS }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar."); return; }
      router.push(`/admin/formularios/${data.form.id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esse formulário e todas as respostas dele?")) return;
    await fetch(`/api/admin/formularios/${id}`, { method: "DELETE" });
    setForms(prev => prev.filter(f => f.id !== id));
  }

  function copyLink(f: FormRow) {
    const url = `${window.location.origin}/formulario/${f.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText size={22} /> Formulários</h1>
          <p className="text-gray-400 text-sm mt-1">Formulário conversacional pra captar lead (anúncio/bio) — ao preencher o WhatsApp, já recebe o convite pro teste grátis.</p>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex-shrink-0"
        >
          <Plus size={15} /> Novo formulário
        </button>
      </div>

      {creating && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Título (uso interno)</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
              placeholder="Ex: Captação — anúncio Instagram"
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Link (/formulario/...)</label>
            <input
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              placeholder="captacao-ia"
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Mensagem de abertura</label>
            <textarea
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              rows={3}
              className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <p className="text-xs text-gray-500">Já vem com as perguntas Nome → WhatsApp. Dá pra editar/adicionar depois de criar.</p>
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
                  <Link href={`/admin/formularios/${f.id}`} className="font-medium hover:text-blue-400 truncate">{f.title}</Link>
                  {!f.active && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">inativo</span>}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">/formulario/{f.slug}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-sm text-gray-400">
                <span>{f.submissionCount} respostas</span>
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
  );
}
