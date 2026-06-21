"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OBJECTIONS = [
  "Está muito caro",
  "Já tenho um fornecedor",
  "Não é o momento agora",
  "Preciso pensar",
  "Não é uma prioridade",
  "Quero ver mais opções",
];

const SEGMENTS = ["SaaS", "Indústria", "Serviços", "Varejo", "Saúde", "Educação"];

export default function ObjecoesPage() {
  const router = useRouter();
  const [objection, setObjection] = useState("");
  const [segment, setSegment] = useState("");
  const [product, setProduct] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!objection || !segment || !product.trim()) return;
    setLoading(true);

    const res = await fetch("/api/objecoes/nova", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objection, segment, product }),
    });

    const { id } = await res.json();
    router.push(`/objecoes/${id}`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Objeções</h1>
        <p className="text-gray-400 mt-1">
          Pratique contornar objeções reais com um cliente simulado por IA
        </p>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Qual objeção quer praticar?</label>
          <div className="flex flex-wrap gap-2">
            {OBJECTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setObjection(o)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  objection === o
                    ? "border-blue-500 bg-blue-950/40 text-blue-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Qual produto/serviço você vende?</label>
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Ex: Software de gestão de vendas, Consultoria B2B..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!objection || !segment || !product.trim() || loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
        >
          {loading ? "Iniciando simulação..." : "Começar simulação"}
        </button>
      </form>
    </div>
  );
}
