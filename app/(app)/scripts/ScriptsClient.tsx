"use client";

import { useState } from "react";

const SEGMENTS = ["SaaS", "Indústria", "Serviços", "Varejo", "Saúde", "Educação"];

type Script = {
  coldCall: string;
  followUpEmail: string;
  proposal: string;
  linkedinMsg: string;
};

export function ScriptsClient() {
  const [segment, setSegment] = useState("");
  const [leadRole, setLeadRole] = useState("");
  const [product, setProduct] = useState("");
  const [painPoint, setPainPoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Script | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!segment || !leadRole.trim() || !product.trim() || !painPoint.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/scripts/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, leadRole, product, painPoint }),
      });
      if (!res.ok) throw new Error("Erro na geração");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Não foi possível gerar os scripts. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gerador de Scripts</h1>
        <p className="text-gray-400 mt-1">IA cria roteiros personalizados para cold call, e-mail e LinkedIn</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Segmento do cliente</label>
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSegment(s)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  segment === s
                    ? "border-blue-500 bg-blue-950/40 text-blue-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {[
          { label: "Cargo do lead", value: leadRole, set: setLeadRole, placeholder: "Ex: Diretor Comercial, CEO, Gerente de TI" },
          { label: "Produto/Serviço", value: product, set: setProduct, placeholder: "Ex: Plataforma de BI, Consultoria de Vendas" },
          { label: "Principal dor do lead", value: painPoint, set: setPainPoint, placeholder: "Ex: Dificuldade em fechar negócios, alta taxa de churn" },
        ].map((f) => (
          <div key={f.label} className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{f.label}</label>
            <input
              type="text"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        ))}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!segment || !leadRole.trim() || !product.trim() || !painPoint.trim() || loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
        >
          {loading ? "Gerando scripts com IA..." : "Gerar scripts"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          {[
            { key: "coldCall", label: "Cold Call" },
            { key: "followUpEmail", label: "E-mail de Follow-up" },
            { key: "proposal", label: "Estrutura de Proposta" },
            { key: "linkedinMsg", label: "Mensagem LinkedIn" },
          ].map(({ key, label }) => (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-sm text-gray-300">{label}</h3>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {result[key as keyof Script]}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(result[key as keyof Script])}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Copiar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
