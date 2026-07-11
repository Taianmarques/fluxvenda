"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Save } from "lucide-react";

type SoldProduct = "CRM" | "PLATAFORMA";

type Props = {
  teamId: string;
  initial: {
    name: string; businessModel: string; segment: string; subsegment: string; size: string;
    managerName: string; managerPhone: string; managerPlan: string; managerPlanExpiresAt: string | null;
    productsOwned: SoldProduct[];
  };
};

const PLANS = ["FREE", "PRO", "TEAM"] as const;
const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const BUSINESS_MODELS = ["B2B", "B2C", "B2B2C"];
const PRODUCTS: { key: SoldProduct; label: string }[] = [
  { key: "CRM", label: "CRM (agente de WhatsApp)" },
  { key: "PLATAFORMA", label: "Plataforma de treinamento" },
];

export function EditEmpresaForm({ teamId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial.name);
  const [businessModel, setBusinessModel] = useState(initial.businessModel);
  const [segment, setSegment] = useState(initial.segment);
  const [subsegment, setSubsegment] = useState(initial.subsegment);
  const [size, setSize] = useState(initial.size);
  const [managerName, setManagerName] = useState(initial.managerName);
  const [managerPhone, setManagerPhone] = useState(initial.managerPhone);
  const [managerPlan, setManagerPlan] = useState(initial.managerPlan);
  const [managerPlanExpiresAt, setManagerPlanExpiresAt] = useState(
    initial.managerPlanExpiresAt ? initial.managerPlanExpiresAt.slice(0, 10) : ""
  );
  const [productsOwned, setProductsOwned] = useState<Set<SoldProduct>>(new Set(initial.productsOwned));

  function toggleProduct(p: SoldProduct) {
    setProductsOwned(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { setError("Nome da empresa é obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/empresas/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), businessModel, segment: segment.trim(), subsegment: subsegment.trim(), size,
          managerName: managerName.trim(), managerPhone: managerPhone.trim(),
          managerPlan, managerPlanExpiresAt: managerPlanExpiresAt || null,
          productsOwned: Array.from(productsOwned),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erro ao salvar."); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-medium"
      >
        <Pencil size={15} /> Editar empresa
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-blue-300">Editando empresa</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Nome da empresa</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Modelo de negócio</label>
          <select value={businessModel} onChange={e => setBusinessModel(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
            {BUSINESS_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Tamanho da equipe</label>
          <select value={size} onChange={e => setSize(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
            {SIZES.map(s => <option key={s} value={s}>{s} pessoas</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Segmento</label>
          <input value={segment} onChange={e => setSegment(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Subsegmento</label>
          <input value={subsegment} onChange={e => setSubsegment(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>
      </div>

      <hr className="border-gray-800" />

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Produtos contratados</p>
        <div className="flex flex-wrap gap-3">
          {PRODUCTS.map(p => (
            <label key={p.key} className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm cursor-pointer">
              <input type="checkbox" checked={productsOwned.has(p.key)} onChange={() => toggleProduct(p.key)} className="w-3.5 h-3.5" />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-800" />

      <p className="text-xs text-gray-500 uppercase tracking-wider">Gestor responsável</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nome do gestor</label>
          <input value={managerName} onChange={e => setManagerName(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Telefone</label>
          <input value={managerPhone} onChange={e => setManagerPhone(e.target.value)} placeholder="Opcional" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Plano</label>
          <select value={managerPlan} onChange={e => setManagerPlan(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Expiração do plano (vazio = sem expiração)</label>
          <input type="date" value={managerPlanExpiresAt} onChange={e => setManagerPlanExpiresAt(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-3">
        <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-200">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
          <Save size={15} /> {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
