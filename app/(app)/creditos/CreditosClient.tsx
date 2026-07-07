"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Zap, CheckCircle2, X, MessageCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { CREDIT_PACKS, estimateMessages, type CreditPack } from "@/lib/credits";

type Status = {
  monthlyTokenLimit: number | null;
  monthlyUsed: number;
  aiCreditsBalance: number;
  overPlan: boolean;
};

type Compra = { id: string; packId: string; tokens: number; valorCentavos: number; createdAt: string };

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CreditosClient({ status, compras }: { status: Status; compras: Compra[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  // Modal de pagamento
  const [packSelecionado, setPackSelecionado] = useState<CreditPack | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"PIX" | "CARTAO">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [gerando, setGerando] = useState(false);
  const [cobranca, setCobranca] = useState<{ compraId: string; pixPayload?: string; invoiceUrl?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pago, setPago] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }
  useEffect(() => () => stopPoll(), []);

  function abrirModal(pack: CreditPack) {
    setPackSelecionado(pack);
    setFormaPagamento("PIX");
    setCpfCnpj("");
    setCobranca(null);
    setPago(false);
    setError("");
  }

  function fecharModal() {
    stopPoll();
    setPackSelecionado(null);
  }

  async function handleGerarCobranca() {
    if (!packSelecionado) return;
    const digits = cpfCnpj.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }
    setGerando(true);
    setError("");
    try {
      const res = await fetch("/api/creditos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: packSelecionado.id, formaPagamento, cpfCnpj: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar a cobrança.");
      setCobranca({ compraId: data.compraId, pixPayload: data.pixPayload, invoiceUrl: data.invoiceUrl });

      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/creditos/compras/${data.compraId}`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === "PAGO") {
          stopPoll();
          setPago(true);
          setTimeout(() => { fecharModal(); router.refresh(); }, 2000);
        }
      }, 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGerando(false);
    }
  }

  function copiarPix() {
    if (!cobranca?.pixPayload) return;
    navigator.clipboard.writeText(cobranca.pixPayload).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {});
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
            Acompanhe o uso do plano e compre créditos extras via Pix ou cartão para não pausar os agentes.
          </p>
        </div>

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

        {error && !packSelecionado && (
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
                  onClick={() => abrirModal(pack)}
                  className={`mt-4 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    pack.destaque ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">Pagamento único via Pix ou cartão (Asaas). Os créditos são liberados automaticamente após a confirmação.</p>
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

      {/* Modal de pagamento */}
      {packSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 relative">
            <button onClick={fecharModal} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={18} /></button>
            <div>
              <p className="font-semibold">{packSelecionado.label}</p>
              <p className="text-sm text-gray-400">{packSelecionado.tokens.toLocaleString("pt-BR")} tokens — {brl(packSelecionado.valorCentavos)}</p>
            </div>

            {pago ? (
              <div className="text-center space-y-2 py-4">
                <CheckCircle2 size={40} className="mx-auto text-green-400" />
                <p className="font-medium text-green-300">Pagamento confirmado!</p>
                <p className="text-sm text-gray-400">Seus créditos já foram adicionados ao saldo.</p>
              </div>
            ) : cobranca ? (
              <div className="space-y-3">
                {formaPagamento === "PIX" && cobranca.pixPayload ? (
                  <>
                    <p className="text-xs text-gray-400">Escaneie ou copie o código Pix no seu banco:</p>
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 break-all font-mono">{cobranca.pixPayload}</p>
                    </div>
                    <button
                      onClick={copiarPix}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-gray-800 hover:bg-gray-700 rounded-xl py-2"
                    >
                      <Copy size={13} /> {copiado ? "Copiado!" : "Copiar código Pix"}
                    </button>
                  </>
                ) : cobranca.invoiceUrl ? (
                  <a
                    href={cobranca.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl py-2.5"
                  >
                    <ExternalLink size={14} /> Abrir link de pagamento
                  </a>
                ) : null}
                <p className="text-xs text-gray-500 flex items-center gap-1.5 justify-center">
                  <Loader2 size={12} className="animate-spin" /> Aguardando confirmação do pagamento...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormaPagamento("PIX")}
                    className={`text-sm font-medium rounded-xl py-2 border transition-colors ${formaPagamento === "PIX" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 text-gray-400"}`}
                  >
                    Pix
                  </button>
                  <button
                    onClick={() => setFormaPagamento("CARTAO")}
                    className={`text-sm font-medium rounded-xl py-2 border transition-colors ${formaPagamento === "CARTAO" ? "border-blue-500 bg-blue-500/10" : "border-gray-800 text-gray-400"}`}
                  >
                    Cartão
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">CPF ou CNPJ</label>
                  <input
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="Só números"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    maxLength={18}
                  />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  onClick={handleGerarCobranca}
                  disabled={gerando}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium"
                >
                  {gerando ? "Gerando cobrança..." : "Continuar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
