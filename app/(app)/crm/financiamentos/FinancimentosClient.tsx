"use client";

import { useState } from "react";
import { Car, Settings, ChevronDown, ChevronUp, ExternalLink, Check } from "lucide-react";

type Simulation = {
  id: string;
  createdAt: string;
  contactNumber: string;
  nomeCliente: string;
  cpf: string;
  dataNascimento: string;
  possuiHabilitacao: boolean;
  valorVeiculo: number;
  valorEntrada: number;
  prazoMeses: number;
  valorParcela: number | null;
  taxaMensal: number | null;
  cet: number | null;
  valorTotal: number | null;
  status: string;
  notas: string;
};

type Props = {
  agentId: string;
  isGestor: boolean;
  initialFinancingEnabled: boolean;
  initialBvSandbox: boolean;
  initialBvCommercialPartnerCode: string;
  initialHasBvCredentials: boolean;
  initialSimulations: Simulation[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SIMULADO:    { label: "Simulado",    color: "bg-blue-500/15 text-blue-300" },
  INTERESSE:   { label: "Interesse",   color: "bg-yellow-500/15 text-yellow-300" },
  ENCAMINHADO: { label: "Encaminhado", color: "bg-green-500/15 text-green-300" },
  DESCARTADO:  { label: "Descartado",  color: "bg-gray-500/15 text-gray-400" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinancimentosClient({
  agentId,
  isGestor,
  initialFinancingEnabled,
  initialBvSandbox,
  initialBvCommercialPartnerCode,
  initialHasBvCredentials,
  initialSimulations,
}: Props) {
  const [financingEnabled, setFinancingEnabled] = useState(initialFinancingEnabled);
  const [bvSandbox, setBvSandbox] = useState(initialBvSandbox);
  const [bvCommercialPartnerCode, setBvCommercialPartnerCode] = useState(initialBvCommercialPartnerCode);
  const [hasBvCredentials, setHasBvCredentials] = useState(initialHasBvCredentials);
  const [bvClientId, setBvClientId] = useState("");
  const [bvClientSecret, setBvClientSecret] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [simulations, setSimulations] = useState<Simulation[]>(initialSimulations);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const counts = {
    SIMULADO:    simulations.filter(s => s.status === "SIMULADO").length,
    INTERESSE:   simulations.filter(s => s.status === "INTERESSE").length,
    ENCAMINHADO: simulations.filter(s => s.status === "ENCAMINHADO").length,
    DESCARTADO:  simulations.filter(s => s.status === "DESCARTADO").length,
  };

  const filtered = statusFilter === "ALL"
    ? simulations
    : simulations.filter(s => s.status === statusFilter);

  async function saveConfig() {
    setSavingConfig(true);
    const body: Record<string, unknown> = { financingEnabled, bvSandbox, bvCommercialPartnerCode };
    if (bvClientId) body.bvClientId = bvClientId;
    if (bvClientSecret) body.bvClientSecret = bvClientSecret;

    const res = await fetch(`/api/agentes/${agentId}/financiamento`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setHasBvCredentials(data.hasBvCredentials);
      setBvCommercialPartnerCode(data.bvCommercialPartnerCode ?? bvCommercialPartnerCode);
      setBvClientId("");
      setBvClientSecret("");
      setShowConfig(false);
    }
    setSavingConfig(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/financiamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSimulations(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Car size={22} className="text-blue-400" />
          <div>
            <h1 className="text-lg font-bold">Financiamentos</h1>
            <p className="text-xs text-gray-400">{simulations.length} simulação{simulations.length !== 1 ? "s" : ""} no total</p>
          </div>
        </div>
        {isGestor && (
          <button
            onClick={() => setShowConfig(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <Settings size={15} />
            Configurar
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Config panel */}
        {showConfig && isGestor && (
          <div className="m-6 p-5 rounded-2xl bg-gray-900 border border-gray-800 space-y-5">
            <h2 className="font-semibold text-sm">Configurações — Banco BV</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ativar simulação de financiamento</p>
                <p className="text-xs text-gray-400 mt-0.5">Permite que o agente colete dados e execute simulações via API do BV</p>
              </div>
              <button
                onClick={() => setFinancingEnabled(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${financingEnabled ? "bg-blue-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${financingEnabled ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Modo sandbox (homologação)</p>
                <p className="text-xs text-gray-400 mt-0.5">Desative para usar a API de produção do Banco BV</p>
              </div>
              <button
                onClick={() => setBvSandbox(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${bvSandbox ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${bvSandbox ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Código do Parceiro BV</label>
                <input
                  type="text"
                  value={bvCommercialPartnerCode}
                  onChange={e => setBvCommercialPartnerCode(e.target.value)}
                  placeholder="Ex: 8659 — código da loja cadastrado no Banco BV"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">commercialPartnerCode fornecido pelo Banco BV ao credenciar a loja.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Client ID (BV Open)</label>
                <input
                  type="text"
                  value={bvClientId}
                  onChange={e => setBvClientId(e.target.value)}
                  placeholder={hasBvCredentials ? "••••••••• (já cadastrado)" : "Cole o Client ID da API do BV"}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Client Secret (BV Open)</label>
                <input
                  type="password"
                  value={bvClientSecret}
                  onChange={e => setBvClientSecret(e.target.value)}
                  placeholder={hasBvCredentials ? "••••••••• (já cadastrado)" : "Cole o Client Secret da API do BV"}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              {hasBvCredentials && !bvClientId && !bvClientSecret && (
                <p className="flex items-center gap-1.5 text-xs text-green-400">
                  <Check size={13} /> Credenciais cadastradas
                </p>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {savingConfig ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="px-6 pt-4 pb-2 grid grid-cols-4 gap-3">
          {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(f => f === key ? "ALL" : key)}
              className={`p-3 rounded-xl border transition-colors text-left ${statusFilter === key ? "border-blue-500 bg-blue-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}
            >
              <p className="text-xl font-bold">{counts[key as keyof typeof counts]}</p>
              <p className={`text-xs mt-1 inline-flex px-2 py-0.5 rounded-full ${color}`}>{label}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm gap-2">
            <Car size={32} className="text-gray-700" />
            <p>Nenhuma simulação encontrada.</p>
            {!financingEnabled && isGestor && (
              <p className="text-xs text-gray-600">Ative o financiamento nas configurações para o agente começar a capturar simulações.</p>
            )}
          </div>
        ) : (
          <div className="px-6 pb-6 overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Cliente</th>
                  <th className="pb-2 pr-4 font-medium">CPF</th>
                  <th className="pb-2 pr-4 font-medium">Veículo</th>
                  <th className="pb-2 pr-4 font-medium">Entrada</th>
                  <th className="pb-2 pr-4 font-medium">Prazo</th>
                  <th className="pb-2 pr-4 font-medium">Parcela</th>
                  <th className="pb-2 pr-4 font-medium">CET</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Data</th>
                  <th className="pb-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map(s => {
                  const st = STATUS_LABELS[s.status] ?? { label: s.status, color: "bg-gray-700 text-gray-300" };
                  return (
                    <tr key={s.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium truncate max-w-[120px]">{s.nomeCliente || "—"}</p>
                        <p className="text-xs text-gray-500">{s.contactNumber}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs font-mono">{s.cpf || "—"}</td>
                      <td className="py-3 pr-4 text-gray-300">{fmt(s.valorVeiculo)}</td>
                      <td className="py-3 pr-4 text-gray-300">{fmt(s.valorEntrada)}</td>
                      <td className="py-3 pr-4 text-gray-300">{s.prazoMeses}x</td>
                      <td className="py-3 pr-4 font-medium text-white">{s.valorParcela != null ? fmt(s.valorParcela) : "—"}</td>
                      <td className="py-3 pr-4 text-gray-400">{s.cet != null ? `${s.cet.toFixed(2)}% a.a.` : "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {s.status === "SIMULADO" && (
                            <button
                              onClick={() => updateStatus(s.id, "ENCAMINHADO")}
                              className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors whitespace-nowrap"
                            >
                              Encaminhar
                            </button>
                          )}
                          {s.status !== "DESCARTADO" && s.status !== "ENCAMINHADO" && (
                            <button
                              onClick={() => updateStatus(s.id, "DESCARTADO")}
                              className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                            >
                              Descartar
                            </button>
                          )}
                          <a
                            href={`/crm/${agentId}?contact=${s.contactNumber}`}
                            className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors inline-flex items-center gap-1"
                          >
                            <ExternalLink size={11} />
                            Ver
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
