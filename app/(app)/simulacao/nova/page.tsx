"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SEGMENTS = ["SaaS", "Indústria", "Serviços", "Varejo", "Saúde", "Educação", "Financeiro"];
const MRRS = [
  { value: 5000,  label: "R$ 5.000",  desc: "Iniciando as vendas" },
  { value: 15000, label: "R$ 15.000", desc: "Primeiros clientes recorrentes" },
  { value: 40000, label: "R$ 40.000", desc: "Crescimento acelerado" },
  { value: 80000, label: "R$ 80.000", desc: "Operação consolidada" },
];
const TEAM_SIZES = [
  { value: "1-2",  label: "1-2 vendedores",  desc: "Equipe enxuta, fundador vende" },
  { value: "3-5",  label: "3-5 vendedores",  desc: "Time pequeno estruturado" },
  { value: "6-15", label: "6-15 vendedores", desc: "Equipe em escala" },
];

export default function NovaSImuacaoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [mrr, setMrr] = useState<number | null>(null);
  const [teamSize, setTeamSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && segment && mrr && teamSize;

  async function handleCreate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/simulacao/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), segment, initialMRR: mrr, teamSize }),
      });
      if (!res.ok) throw new Error();
      router.push("/simulacao/jogar");
    } catch {
      setError("Erro ao criar empresa. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="text-center space-y-2 pt-4">
          <p className="text-4xl">🏢</p>
          <h1 className="text-2xl font-bold">Criar empresa virtual</h1>
          <p className="text-gray-400 text-sm">Configure sua empresa e comece a simulação. A IA vai gerar cenários reais do seu segmento mês a mês.</p>
        </div>

        <div className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nome da empresa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: VendaMais Soluções"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Segmento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Segmento de mercado *</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <button key={s} type="button" onClick={() => setSegment(s)}
                  className={`px-4 py-2 rounded-full text-sm border transition-all ${segment === s ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* MRR inicial */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">MRR inicial (receita recorrente mensal) *</label>
            <div className="grid grid-cols-2 gap-3">
              {MRRS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMrr(m.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${mrr === m.value ? "border-blue-500 bg-blue-950/40" : "border-gray-700 hover:border-gray-600"}`}>
                  <p className="font-bold text-lg">{m.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Equipe */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Tamanho da equipe de vendas *</label>
            <div className="space-y-2">
              {TEAM_SIZES.map((t) => (
                <button key={t.value} type="button" onClick={() => setTeamSize(t.value)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${teamSize === t.value ? "border-blue-500 bg-blue-950/40" : "border-gray-700 hover:border-gray-600"}`}>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!canSubmit || loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all"
          >
            {loading ? "Criando empresa..." : "🚀 Iniciar simulação"}
          </button>
        </div>

      </div>
    </div>
  );
}
