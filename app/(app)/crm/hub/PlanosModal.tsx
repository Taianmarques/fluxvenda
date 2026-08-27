"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Copy, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { CRM_PLAN_TIERS, type CrmPlanTier } from "@/lib/crm-plans";

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Modal "Ver planos" — grade de planos (estilo da referência que o usuário passou) + etapa
// de pagamento reaproveitando o mesmo fluxo Asaas Pix/Cartão de app/(app)/creditos/CreditosClient.tsx.
export function PlanosModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [tierSelecionado, setTierSelecionado] = useState<CrmPlanTier | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"PIX" | "CARTAO">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState("");
  const [cobranca, setCobranca] = useState<{ compraId: string; pixPayload?: string; invoiceUrl?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pago, setPago] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }
  useEffect(() => () => stopPoll(), []);

  function abrirPagamento(tier: CrmPlanTier) {
    setTierSelecionado(tier);
    setFormaPagamento("PIX");
    setCpfCnpj("");
    setCobranca(null);
    setPago(false);
    setError("");
  }

  async function handleGerarCobranca() {
    if (!tierSelecionado) return;
    const digits = cpfCnpj.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }
    setGerando(true);
    setError("");
    try {
      const res = await fetch("/api/planos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tierSelecionado.id, formaPagamento, cpfCnpj: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar a cobrança.");
      setCobranca({ compraId: data.compraId, pixPayload: data.pixPayload, invoiceUrl: data.invoiceUrl });

      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/planos/compras/${data.compraId}`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === "PAGO") {
          stopPoll();
          setPago(true);
          setTimeout(() => { router.refresh(); onClose(); }, 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="mx-auto text-center flex-1">
            <h2 className="text-2xl font-bold">Planos FluxVenda</h2>
            <p className="text-sm text-gray-500 mt-1">Encontre o plano que atende às necessidades da sua equipe.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {!tierSelecionado ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-gray-100 rounded-xl p-1 text-sm font-medium">
                <span title="Em breve" className="px-4 py-1.5 rounded-lg text-gray-400 cursor-not-allowed">Anual</span>
                <span title="Em breve" className="px-4 py-1.5 rounded-lg text-gray-400 cursor-not-allowed">Semestral</span>
                <span className="px-4 py-1.5 rounded-lg bg-blue-600 text-white">Mensal</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              {CRM_PLAN_TIERS.map(tier => (
                <div
                  key={tier.id}
                  className={`relative flex flex-col rounded-2xl border p-5 ${tier.destaque ? "border-blue-500 shadow-md" : "border-gray-200"}`}
                >
                  {tier.destaque && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                      Recomendado
                    </span>
                  )}
                  <p className="font-bold text-lg text-blue-700">{tier.label}</p>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{tier.description}</p>

                  <ul className="mt-4 space-y-2 flex-1">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <p className="text-2xl font-bold">
                      {brl(tier.valorCentavos)}<span className="text-sm font-normal text-gray-400">/mês</span>
                    </p>
                    <button
                      onClick={() => abrirPagamento(tier)}
                      className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                        tier.destaque ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-900 hover:bg-gray-800"
                      }`}
                    >
                      Atualizar plano
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-sm mx-auto">
            <button onClick={() => setTierSelecionado(null)} className="text-xs text-gray-400 hover:text-gray-700 mb-3">
              ← Voltar pros planos
            </button>
            <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="font-semibold">Plano {tierSelecionado.label}</p>
                <p className="text-sm text-gray-500">{brl(tierSelecionado.valorCentavos)}/mês</p>
              </div>

              {pago ? (
                <div className="text-center space-y-2 py-4">
                  <CheckCircle2 size={40} className="mx-auto text-green-600" />
                  <p className="font-medium text-green-700">Pagamento confirmado!</p>
                  <p className="text-sm text-gray-500">Seu plano foi atualizado.</p>
                </div>
              ) : cobranca ? (
                <div className="space-y-3">
                  {formaPagamento === "PIX" && cobranca.pixPayload ? (
                    <>
                      <p className="text-xs text-gray-500">Escaneie ou copie o código Pix no seu banco:</p>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[10px] text-gray-600 break-all font-mono">{cobranca.pixPayload}</p>
                      </div>
                      <button
                        onClick={copiarPix}
                        className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-xl py-2"
                      >
                        <Copy size={13} /> {copiado ? "Copiado!" : "Copiar código Pix"}
                      </button>
                    </>
                  ) : cobranca.invoiceUrl ? (
                    <a
                      href={cobranca.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl py-2.5"
                    >
                      <ExternalLink size={14} /> Abrir link de pagamento
                    </a>
                  ) : null}
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 justify-center">
                    <Loader2 size={12} className="animate-spin" /> Aguardando confirmação do pagamento...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormaPagamento("PIX")}
                      className={`text-sm font-medium rounded-xl py-2 border transition-colors ${formaPagamento === "PIX" ? "border-blue-500 bg-blue-50" : "border-gray-200 text-gray-500"}`}
                    >
                      Pix
                    </button>
                    <button
                      onClick={() => setFormaPagamento("CARTAO")}
                      className={`text-sm font-medium rounded-xl py-2 border transition-colors ${formaPagamento === "CARTAO" ? "border-blue-500 bg-blue-50" : "border-gray-200 text-gray-500"}`}
                    >
                      Cartão
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">CPF ou CNPJ</label>
                    <input
                      value={cpfCnpj}
                      onChange={e => setCpfCnpj(e.target.value)}
                      placeholder="Só números"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      maxLength={18}
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    onClick={handleGerarCobranca}
                    disabled={gerando}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium"
                  >
                    {gerando ? "Gerando cobrança..." : "Continuar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
