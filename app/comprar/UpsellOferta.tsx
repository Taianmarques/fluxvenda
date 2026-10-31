"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, CreditCard, Loader2, QrCode } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";

type Upsell = {
  produtoId: string; nome: string; beneficio: string; descricao: string; capaUrl: string | null; icone: string;
  chamada: string; precoCentavos: number; cartaoFinal: string | null;
};

// Oferta depois da compra confirmada (upsell). Só cobra com o clique de confirmação do comprador:
// no mesmo cartão (token do Asaas, se houver) ou num Pix novo. Recusar não muda nada.
export function UpsellOferta({ compraId, token }: { compraId: string; token: string }) {
  const [upsell, setUpsell] = useState<Upsell | null>(null);
  const [fase, setFase] = useState<"oferta" | "processando" | "pix" | "pago" | "recusado">("oferta");
  const [pix, setPix] = useState<{ payload: string; imagem: string } | null>(null);
  const [novaCompra, setNovaCompra] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch(`/api/comprar/upsell/${compraId}?t=${encodeURIComponent(token)}`)
      .then(r => r.json()).then(d => setUpsell(d.upsell ?? null)).catch(() => {});
  }, [compraId, token]);

  // Pix do upsell: espera a confirmação como no checkout
  useEffect(() => {
    if (fase !== "pix" || !novaCompra) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/comprar/status/${novaCompra}`).then(r => r.json()).catch(() => null);
      if (d?.status === "PAGO") setFase("pago");
    }, 4000);
    return () => clearInterval(t);
  }, [fase, novaCompra]);

  async function aceitar(forma: "CARTAO_SALVO" | "PIX") {
    setErro(null);
    setFase("processando");
    const res = await fetch(`/api/comprar/upsell/${compraId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, forma }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { setErro(d?.error ?? "Não foi possível concluir. Tente de novo."); setFase("oferta"); return; }
    setNovaCompra(d.compraId);
    if (d.status === "PAGO") setFase("pago");
    else if (d.pix) { setPix(d.pix); setFase("pix"); }
    else if (d.status === "PENDENTE") setFase("pix");
    else { setErro("O pagamento não foi aprovado. Você pode tentar com Pix."); setFase("oferta"); }
  }

  if (!upsell || fase === "recusado") return null;
  const brlU = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="max-w-md w-full rounded-2xl border-2 border-indigo-200 bg-white p-6 space-y-4 shadow-sm">
      {fase === "pago" ? (
        <div className="text-center space-y-2">
          <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
          <p className="font-semibold">{upsell.nome} adicionado!</p>
          <p className="text-sm text-slate-600">Já está liberado na sua Minha Biblioteca.</p>
        </div>
      ) : fase === "pix" ? (
        <div className="text-center space-y-3">
          <p className="font-semibold">Pague com Pix para liberar o {upsell.nome}</p>
          {pix && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${pix.imagem}`} alt="QR Code do Pix" className="mx-auto w-48 h-48" />
              <button
                onClick={async () => { await navigator.clipboard.writeText(pix.payload).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white"
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Código copiado!" : "Copiar código Pix"}
              </button>
            </>
          )}
          <p className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Aguardando a confirmação…</p>
        </div>
      ) : (
        <>
          <span className="inline-block rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">Oferta para quem acabou de comprar</span>
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {upsell.capaUrl ? <img src={upsell.capaUrl} alt="" className="w-full h-full object-cover" /> : <CentralIcone nome={upsell.icone} size={26} />}
            </div>
            <div className="min-w-0">
              <p className="font-bold leading-snug">{upsell.nome}</p>
              <p className="mt-1 text-sm text-slate-600">{upsell.chamada || upsell.beneficio || upsell.descricao}</p>
            </div>
          </div>
          <p className="text-2xl font-bold tabular-nums">{brlU(upsell.precoCentavos)}</p>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="space-y-2">
            {upsell.cartaoFinal && (
              <button onClick={() => aceitar("CARTAO_SALVO")} disabled={fase === "processando"} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {fase === "processando" ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Sim, quero — pagar {brlU(upsell.precoCentavos)} no cartão final {upsell.cartaoFinal}
              </button>
            )}
            <button
              onClick={() => aceitar("PIX")} disabled={fase === "processando"}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${upsell.cartaoFinal ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
            >
              {fase === "processando" && !upsell.cartaoFinal ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {upsell.cartaoFinal ? "Prefiro pagar com Pix" : `Sim, quero adicionar — pagar ${brlU(upsell.precoCentavos)} com Pix`}
            </button>
            <button onClick={() => setFase("recusado")} className="w-full text-sm text-slate-500 hover:text-slate-800 py-1">Não, obrigado</button>
          </div>
          <p className="text-xs text-slate-400 text-center">A cobrança só é feita se você confirmar. Seus produtos já comprados continuam liberados.</p>
        </>
      )}
    </div>
  );
}
