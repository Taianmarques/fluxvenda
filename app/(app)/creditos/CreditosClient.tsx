"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Zap, CheckCircle2, XCircle, X, MessageCircle } from "lucide-react";
import { CREDIT_PACKS, estimateMessages } from "@/lib/credits";

type Status = {
  monthlyTokenLimit: number | null;
  monthlyUsed: number;
  aiCreditsBalance: number;
  overPlan: boolean;
};

type Compra = { id: string; packId: string; tokens: number; valorCentavos: number; createdAt: string };

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CreditosClient({ status, compras, resultadoCompra }: {
  status: Status;
  compras: Compra[];
  resultadoCompra: "sucesso" | "cancelada" | null;
}) {
  const router = useRouter();
  const [comprando, setComprando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState(resultadoCompra);

  // Após voltar do Stripe com sucesso, o webhook pode levar alguns segundos pra creditar —
  // atualiza a página automaticamente uma vez para pegar o saldo mais recente.
  useEffect(() => {
    if (resultadoCompra === "sucesso") {
      const t = setTimeout(() => router.refresh(), 3000);
      return () => clearTimeout(t);
    }
  }, [resultadoCompra, router]);

  async function handleComprar(packId: string) {
    setComprando(packId);
    setError("");
    try {
      const res = await fetch("/api/creditos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro ao iniciar o pagamento.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setComprando(null);
    }
  }

  const pctUsado = status.monthlyTokenLimit ? Math.min(100, (status.monthlyUsed / status.monthlyTokenLimit) * 100) : null;

  return (
    <div className="min-h-full bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Plataforma</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <Coins size={26} className="text-blue-400" /> Créditos de IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe o uso do plano e compre créditos extras para não pausar os agentes quando a cota mensal acabar.
          </p>
        </div>

        {banner && (
          <div className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-2 ${
            banner === "sucesso" ? "bg-green-900/30 border-green-800/50 text-green-300" : "bg-amber-900/30 border-amber-800/50 text-amber-300"
          }`}>
            <span className="flex items-center gap-2 text-sm">
              {banner === "sucesso" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {banner === "sucesso"
                ? "Pagamento confirmado! O saldo de créditos será atualizado em poucos segundos."
                : "Pagamento cancelado — nenhum crédito foi cobrado."}
            </span>
            <button onClick={() => setBanner(null)} className="flex-shrink-0 opacity-70 hover:opacity-100"><X size={14} /></button>
          </div>
        )}

        {/* Status atual */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-400">Cota do plano (mês atual)</p>
            {status.monthlyTokenLimit === null ? (
              <p className="text-lg font-bold text-gray-300 mt-2">Sem limite definido</p>
            ) : (
              <>
                <p className="text-2xl font-bold mt-2">
                  {status.monthlyUsed.toLocaleString("pt-BR")} <span className="text-sm text-gray-500 font-normal">/ {status.monthlyTokenLimit.toLocaleString("pt-BR")} tokens</span>
                </p>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all ${status.overPlan ? "bg-red-500" : (pctUsado ?? 0) >= 80 ? "bg-amber-500" : "bg-blue-600"}`}
                    style={{ width: `${pctUsado ?? 0}%` }}
                  />
                </div>
                {status.overPlan && (
                  <p className="text-xs text-red-400 mt-2">
                    Cota do mês esgotada — {status.aiCreditsBalance > 0 ? "os agentes estão usando seus créditos extras." : "os agentes vão pausar até o próximo mês ou você comprar créditos."}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="bg-gray-900 border border-blue-800/40 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-400 flex items-center gap-1.5"><Zap size={13} className="text-blue-400" /> Saldo de créditos extras</p>
            <p className="text-2xl font-bold mt-2 text-blue-400">{status.aiCreditsBalance.toLocaleString("pt-BR")} <span className="text-sm text-gray-500 font-normal">tokens</span></p>
            <p className="text-xs text-gray-500 mt-2">
              Não expiram. São usados automaticamente só depois que a cota do plano acaba — em ~{estimateMessages(status.aiCreditsBalance).toLocaleString("pt-BR")} mensagens de atendimento.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start justify-between gap-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={14} /></button>
          </div>
        )}

        {/* Pacotes */}
        <div>
          <p className="font-semibold mb-3">Comprar créditos</p>
          <div className="grid md:grid-cols-3 gap-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`rounded-2xl border p-5 flex flex-col ${pack.destaque ? "border-blue-500 bg-blue-500/5" : "border-gray-800 bg-gray-900"}`}
              >
                {pack.destaque && (
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-2">Mais popular</span>
                )}
                <p className="font-semibold">{pack.label}</p>
                <p className="text-2xl font-bold mt-1">{brl(pack.valorCentavos)}</p>
                <p className="text-sm text-gray-400 mt-2">{pack.tokens.toLocaleString("pt-BR")} tokens</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MessageCircle size={11} /> ~{estimateMessages(pack.tokens).toLocaleString("pt-BR")} mensagens de atendimento
                </p>
                <button
                  onClick={() => handleComprar(pack.id)}
                  disabled={comprando !== null}
                  className={`mt-4 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    pack.destaque ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  {comprando === pack.id ? "Redirecionando..." : "Comprar"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">Pagamento único e seguro via Stripe. Os créditos são liberados automaticamente após a confirmação.</p>
        </div>

        {/* Histórico */}
        {compras.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <p className="font-semibold p-5 pb-3">Histórico de compras</p>
            <div className="divide-y divide-gray-800">
              {compras.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.tokens.toLocaleString("pt-BR")} tokens</p>
                    <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <p className="font-semibold text-green-400">{brl(c.valorCentavos)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
