"use client";

import { useState } from "react";
import { Landmark, Settings } from "lucide-react";

type Cobranca = {
  id: string; nomeDevedor: string; contactNumber: string; valor: number; descricao: string;
  vencimento: string; status: string; recorrencia: string; boletoUrl: string | null; paidAt: string | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDENTE:       { label: "Pendente",        color: "bg-gray-800 text-gray-400 border-gray-700" },
  BOLETO_GERADO:  { label: "Boleto enviado",  color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" },
  PAGO:           { label: "Pago",            color: "bg-green-900/40 text-green-300 border-green-800/50" },
  VENCIDA:        { label: "Vencida",         color: "bg-red-900/40 text-red-300 border-red-800/50" },
  CANCELADA:      { label: "Cancelada",       color: "bg-gray-800 text-gray-500 border-gray-700" },
};

function formatBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function CobrancaClient({ agentId, initialCobrancaEnabled, initialCobrancas }: {
  agentId: string;
  initialCobrancaEnabled: boolean;
  initialCobrancas: Cobranca[];
}) {
  const [cobrancaEnabled, setCobrancaEnabled] = useState(initialCobrancaEnabled);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>(initialCobrancas);

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState(""); const [fone, setFone] = useState(""); const [cpfCnpj, setCpfCnpj] = useState(""); const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState(""); const [vencimento, setVencimento] = useState("");
  const [recorrencia, setRecorrencia] = useState("UNICA"); const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");

  async function loadCobrancas() {
    const r = await fetch(`/api/agentes/${agentId}/cobrancas`);
    const d = await r.json();
    setCobrancas(d.cobrancas ?? []);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await fetch(`/api/agentes/${agentId}/comercio`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cobrancaEnabled }),
      });
    } finally { setSavingSettings(false); }
  }

  async function handleAddCobranca() {
    setFormError("");
    const v = Number(valor.replace(",", "."));
    if (!nome.trim() || !fone.trim() || !Number.isFinite(v) || v <= 0 || !vencimento) {
      setFormError("Preencha nome, telefone, valor e vencimento.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/cobrancas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeDevedor: nome.trim(), contactNumber: fone.trim().replace(/\D/g, ""), cpfCnpj: cpfCnpj.trim().replace(/\D/g, ""), valor: v, descricao: descricao.trim(), vencimento, recorrencia, numeroParcelas }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setFormError(d.error ?? "Erro ao cadastrar."); return; }
      setNome(""); setFone(""); setCpfCnpj(""); setValor(""); setDescricao(""); setVencimento(""); setRecorrencia("UNICA"); setNumeroParcelas(1);
      setShowForm(false);
      loadCobrancas();
    } finally { setSaving(false); }
  }

  async function handleEnviarAgora(id: string) {
    await fetch(`/api/ferramentas/whatsapp/cobrancas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enviarAgora: true }),
    });
    loadCobrancas();
  }

  async function handleMarcarPago(id: string) {
    await fetch(`/api/ferramentas/whatsapp/cobrancas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGO" }),
    });
    loadCobrancas();
  }

  async function handleCancelar(id: string) {
    if (!confirm("Cancelar essa cobrança?")) return;
    await fetch(`/api/ferramentas/whatsapp/cobrancas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADA" }),
    });
    loadCobrancas();
  }

  async function handleProrrogar(id: string) {
    const novaData = prompt("Nova data de vencimento (AAAA-MM-DD):");
    if (!novaData || !novaData.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    const res = await fetch(`/api/ferramentas/whatsapp/cobrancas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novaData }),
    });
    if (!res.ok) { alert("Não foi possível prorrogar o boleto."); return; }
    loadCobrancas();
  }

  const RECORRENCIA_OPTIONS = [
    { value: "UNICA", label: "Única" }, { value: "SEMANAL", label: "Semanal" },
    { value: "QUINZENAL", label: "Quinzenal" }, { value: "MENSAL", label: "Mensal" }, { value: "ANUAL", label: "Anual" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Landmark size={28} className="text-blue-400" /> Cobranças</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(s => !s)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium">+ Nova cobrança</button>
            <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <Settings size={15} /> Configurar
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cobrancaEnabled} onChange={e => setCobrancaEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar agente de cobrança (responde e cobra via WhatsApp)</span>
            </label>
            <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {savingSettings ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Nova cobrança</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Nome do devedor" value={nome} onChange={e => setNome(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm md:col-span-2" />
              <input placeholder="WhatsApp (só números)" value={fone} onChange={e => setFone(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="CPF ou CNPJ (só números)" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Valor (R$)" value={valor} onChange={e => setValor(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
                {RECORRENCIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {recorrencia !== "UNICA" && (
                <input type="number" min={2} max={60} value={numeroParcelas} onChange={e => setNumeroParcelas(Math.max(2, Number(e.target.value)))} placeholder="Nº de vezes" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              )}
            </div>
            <input placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <button onClick={handleAddCobranca} disabled={saving} className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium">
              {saving ? "Cadastrando..." : "Cadastrar e enviar boleto"}
            </button>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">Lista de cobranças</p>
          {cobrancas.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhuma cobrança cadastrada ainda.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {cobrancas.map(c => {
                const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.PENDENTE;
                return (
                  <div key={c.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{c.nomeDevedor}</p>
                        <p className="text-xs text-gray-500">{c.contactNumber} · {c.recorrencia !== "UNICA" ? c.recorrencia : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatBRL(c.valor)}</span>
                        <span className="text-xs text-gray-500">{new Date(c.vencimento).toLocaleDateString("pt-BR")}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                    {c.descricao && <p className="text-xs text-gray-500">{c.descricao}</p>}
                    {c.boletoUrl && (
                      <a href={c.boletoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">Ver boleto</a>
                    )}
                    <div className="flex gap-3 text-xs pt-1">
                      {(c.status === "PENDENTE" || c.status === "BOLETO_GERADO") && (
                        <button onClick={() => handleEnviarAgora(c.id)} className="text-blue-400 hover:text-blue-300">2ª via</button>
                      )}
                      {(c.status === "PENDENTE" || c.status === "BOLETO_GERADO" || c.status === "VENCIDA") && (
                        <button onClick={() => handleProrrogar(c.id)} className="text-amber-400 hover:text-amber-300">Prorrogar</button>
                      )}
                      {c.status !== "PAGO" && c.status !== "CANCELADA" && (
                        <button onClick={() => handleMarcarPago(c.id)} className="text-green-400 hover:text-green-300">Marcar pago</button>
                      )}
                      {c.status !== "CANCELADA" && c.status !== "PAGO" && (
                        <button onClick={() => handleCancelar(c.id)} className="text-red-400 hover:text-red-300">Cancelar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
