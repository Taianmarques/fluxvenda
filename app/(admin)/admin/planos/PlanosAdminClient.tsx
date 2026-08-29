"use client";

import { useState } from "react";
import { CreditCard, Plus, Pencil, Trash2, Star, Check, X, Loader2, Eye, EyeOff } from "lucide-react";

type Tier = {
  id: string;
  label: string;
  description: string;
  destaque: boolean;
  active: boolean;
  order: number;
  features: string[];
  precoMensalCentavos: number;
  precoSemestralCentavos: number;
  precoAnualCentavos: number;
};

type FormState = {
  id: string; // só editável na criação
  label: string;
  description: string;
  destaque: boolean;
  order: string;
  features: string[];
  precoMensal: string;    // em reais, como o admin digita
  precoSemestral: string;
  precoAnual: string;
};

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function slugify(label: string): string {
  return label
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function reaisToCentavos(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centavosToReaisInput(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",");
}

function emptyForm(): FormState {
  return { id: "", label: "", description: "", destaque: false, order: "0", features: [""], precoMensal: "", precoSemestral: "", precoAnual: "" };
}

function tierToForm(t: Tier): FormState {
  return {
    id: t.id,
    label: t.label,
    description: t.description,
    destaque: t.destaque,
    order: String(t.order),
    features: t.features.length > 0 ? t.features : [""],
    precoMensal: centavosToReaisInput(t.precoMensalCentavos),
    precoSemestral: centavosToReaisInput(t.precoSemestralCentavos),
    precoAnual: centavosToReaisInput(t.precoAnualCentavos),
  };
}

export function PlanosAdminClient({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setError("");
    setMode("new");
  }

  function startEdit(tier: Tier) {
    setForm(tierToForm(tier));
    setEditingId(tier.id);
    setError("");
    setMode("edit");
  }

  function cancelForm() {
    setMode("list");
    setEditingId(null);
    setError("");
  }

  function updateFeature(i: number, value: string) {
    setForm(f => ({ ...f, features: f.features.map((v, idx) => (idx === i ? value : v)) }));
  }
  function addFeature() {
    setForm(f => ({ ...f, features: [...f.features, ""] }));
  }
  function removeFeature(i: number) {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    setError("");
    if (!form.label.trim()) { setError("Informe o nome do plano."); return; }
    const features = form.features.map(f => f.trim()).filter(Boolean);
    const payload = {
      label: form.label.trim(),
      description: form.description.trim(),
      destaque: form.destaque,
      order: Number(form.order) || 0,
      features,
      precoMensalCentavos: reaisToCentavos(form.precoMensal),
      precoSemestralCentavos: reaisToCentavos(form.precoSemestral),
      precoAnualCentavos: reaisToCentavos(form.precoAnual),
    };

    setSaving(true);
    try {
      if (mode === "new") {
        const id = form.id.trim() ? form.id.trim().toUpperCase() : slugify(form.label);
        if (!id) { setError("Não foi possível gerar um identificador a partir do nome — informe um manualmente."); return; }
        const res = await fetch("/api/admin/planos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Erro ao criar plano."); return; }
        setTiers(prev => [...prev, { ...payload, id, active: true }].sort((a, b) => a.order - b.order));
      } else if (editingId) {
        const res = await fetch(`/api/admin/planos/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Erro ao salvar plano."); return; }
        setTiers(prev => prev.map(t => (t.id === editingId ? { ...t, ...payload } : t)).sort((a, b) => a.order - b.order));
      }
      setMode("list");
      setEditingId(null);
    } catch {
      setError("Falha na conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(tier: Tier) {
    setTogglingId(tier.id);
    try {
      const res = await fetch(`/api/admin/planos/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !tier.active }),
      });
      if (res.ok) setTiers(prev => prev.map(t => (t.id === tier.id ? { ...t, active: !t.active } : t)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(tier: Tier) {
    if (!confirm(`Excluir o plano "${tier.label}"? Compras já feitas desse plano continuam no histórico, mas o nome/preço somem daqui. Considere só desativar em vez de excluir.`)) return;
    setDeletingId(tier.id);
    try {
      const res = await fetch(`/api/admin/planos/${tier.id}`, { method: "DELETE" });
      if (res.ok) setTiers(prev => prev.filter(t => t.id !== tier.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard size={24} className="text-blue-400" /> Planos do CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Preços e recursos exibidos em Hub &gt; Ver planos. Mudanças aqui valem na hora, sem precisar de deploy.</p>
        </div>
        {mode === "list" && (
          <button onClick={startCreate} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
            <Plus size={16} /> Novo plano
          </button>
        )}
      </div>

      {(mode === "new" || mode === "edit") && (
        <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{mode === "new" ? "Novo plano" : `Editando: ${form.label}`}</p>
            <button onClick={cancelForm} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome do plano</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Starter" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            {mode === "new" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Identificador (opcional — gerado do nome se deixar em branco)</label>
                <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))} placeholder={slugify(form.label) || "STARTER_PLUS"} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Descrição curta</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Para quem está começando..." className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ordem</label>
              <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mensal (R$)</label>
              <input value={form.precoMensal} onChange={e => setForm(f => ({ ...f, precoMensal: e.target.value }))} placeholder="297,00" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Semestral — total (R$)</label>
              <input value={form.precoSemestral} onChange={e => setForm(f => ({ ...f, precoSemestral: e.target.value }))} placeholder="1477,20" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Anual — total (R$)</label>
              <input value={form.precoAnual} onChange={e => setForm(f => ({ ...f, precoAnual: e.target.value }))} placeholder="2540,97" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">Semestral/Anual são o valor total cobrado à vista pelo ciclo inteiro (não por mês) — o "por mês" exibido na grade é calculado automaticamente.</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))} className="w-4 h-4" />
            <span className="text-sm">Marcar como "Recomendado" (selo de destaque na grade)</span>
          </label>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Recursos inclusos (um por linha)</label>
            <div className="space-y-2">
              {form.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={feat} onChange={e => updateFeature(i, e.target.value)} placeholder="Ex: Cadastro de até 15 membros na equipe" className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                  <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-400 flex-shrink-0"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <button onClick={addFeature} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={13} /> Adicionar recurso</button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Salvando..." : "Salvar plano"}
            </button>
            <button onClick={cancelForm} className="text-sm text-gray-400 hover:text-white px-3">Cancelar</button>
          </div>
        </div>
      )}

      {mode === "list" && (
        <div className="grid md:grid-cols-2 gap-4">
          {tiers.map(tier => (
            <div key={tier.id} className={`bg-gray-900 border rounded-2xl p-5 space-y-3 ${tier.active ? "border-gray-800" : "border-gray-800 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-lg flex items-center gap-1.5">
                    {tier.label}
                    {tier.destaque && <Star size={14} className="text-amber-400 fill-amber-400" />}
                  </p>
                  <p className="text-xs text-gray-600 font-mono">{tier.id}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${tier.active ? "bg-green-900/40 text-green-300 border-green-800/50" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                  {tier.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-xs text-gray-400">{tier.description}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5">
                  <p className="text-gray-500">Mensal</p>
                  <p className="font-semibold">{brl(tier.precoMensalCentavos)}</p>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5">
                  <p className="text-gray-500">Semestral</p>
                  <p className="font-semibold">{brl(tier.precoSemestralCentavos)}</p>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5">
                  <p className="text-gray-500">Anual</p>
                  <p className="font-semibold">{brl(tier.precoAnualCentavos)}</p>
                </div>
              </div>

              <ul className="space-y-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <Check size={12} className="text-blue-400 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => startEdit(tier)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Pencil size={12} /> Editar</button>
                <button onClick={() => handleToggleActive(tier)} disabled={togglingId === tier.id} className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 disabled:opacity-50">
                  {tier.active ? <EyeOff size={12} /> : <Eye size={12} />} {tier.active ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => handleDelete(tier)} disabled={deletingId === tier.id} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"><Trash2 size={12} /> Excluir</button>
              </div>
            </div>
          ))}
          {tiers.length === 0 && (
            <p className="text-sm text-gray-500 col-span-2">Nenhum plano cadastrado ainda. Clique em "Novo plano" para criar o primeiro.</p>
          )}
        </div>
      )}
    </div>
  );
}
