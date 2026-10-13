"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Copy, ExternalLink, Loader2, Lock, ShieldCheck } from "lucide-react";
import { checkoutTotal, formatBRL, type CheckoutStep } from "@/lib/lead-form-shared";
import { trackPixel } from "./form-runtime";

// Tela de checkout do quiz em telas: oferta (preço de/por, parcelas, contador, selos) + dados do
// comprador + pagamento por Pix (QR na tela, confirma sozinho) ou cartão (aprovação na hora).
// A cobrança é criada em /api/formularios/[slug]/checkout, que recalcula o valor no servidor.

const inputCls = "w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-[16px] focus:outline-none focus:border-slate-400";

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

// Contador da oferta: o prazo começa quando o lead chega na tela e fica guardado na sessão,
// pra não reiniciar se ele recarregar a página
function useCountdown(key: string, minutos: number) {
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    if (minutos <= 0) return;
    let fim = Date.now() + minutos * 60000;
    try {
      const salvo = Number(sessionStorage.getItem(key));
      if (salvo > Date.now()) fim = salvo; else sessionStorage.setItem(key, String(fim));
    } catch { /* sem sessionStorage: conta só nesta visita */ }
    const tick = () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    const t = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [key, minutos]);
  return restante;
}

type Lead = { nome: string; email: string; telefone: string };

export function CheckoutTela({
  step, slug, submissionId, accent, lead, hasNext, onContinue,
}: {
  step: CheckoutStep; slug: string; submissionId: string | undefined; accent: string; lead: Lead;
  hasNext: boolean; onContinue: () => void;
}) {
  const [nome, setNome] = useState(lead.nome);
  const [email, setEmail] = useState(lead.email);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState(lead.telefone);
  const [metodo, setMetodo] = useState<"PIX" | "CARTAO">(step.pix ? "PIX" : "CARTAO");
  const [parcelas, setParcelas] = useState(1);
  const [card, setCard] = useState({ holderName: "", number: "", validade: "", ccv: "", postalCode: "", addressNumber: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ payload: string; qr: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pago, setPago] = useState(false);
  const restante = useCountdown(`fv-timer-${slug}-${step.id}`, step.timerMinutos);

  const parcelaMax = Math.max(1, step.parcelasMax);
  const totalMax = checkoutTotal(step, parcelaMax);

  function confirmarPago(valor: number) {
    setPago(true);
    trackPixel("Purchase", { value: valor, currency: "BRL", content_name: step.produtoNome });
  }

  // Pix gerado: consulta o status até o webhook do Asaas confirmar
  useEffect(() => {
    if (!pix || pago || !submissionId) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/formularios/${slug}/checkout?submissionId=${submissionId}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status === "PAGO") confirmarPago(step.precoPor);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix, pago, submissionId]);

  async function pagar() {
    if (sending) return;
    if (!submissionId) { setError("Responda o quiz antes de pagar."); return; }
    setSending(true);
    setError(null);
    const [mm, aa] = card.validade.split("/").map(s => s.trim());
    try {
      const res = await fetch(`/api/formularios/${slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId, stepId: step.id, nome, email, cpf, telefone, metodo, parcelas,
          ...(metodo === "CARTAO" && {
            cartao: {
              holderName: card.holderName, number: card.number, expiryMonth: (mm ?? "").padStart(2, "0"), expiryYear: aa ?? "",
              ccv: card.ccv, postalCode: card.postalCode, addressNumber: card.addressNumber,
            },
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Não foi possível concluir o pagamento."); return; }
      if (data.status === "PAGO") { confirmarPago(metodo === "CARTAO" ? checkoutTotal(step, parcelas) : step.precoPor); return; }
      if (data.pixPayload) setPix({ payload: data.pixPayload, qr: data.pixQrBase64 });
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  if (pago) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-600 flex items-center justify-center"><Check size={32} className="text-white" /></div>
        <h1 className="text-3xl font-extrabold">{step.sucessoTitulo || "Pagamento confirmado!"}</h1>
        {step.sucessoTexto && <p className="text-[17px] text-slate-700 whitespace-pre-line">{step.sucessoTexto}</p>}
        {step.acessoUrl && (
          <a href={step.acessoUrl} className="flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-white" style={{ backgroundColor: accent }}>
            {step.acessoBotao || "Acessar agora"} <ExternalLink size={16} />
          </a>
        )}
        {hasNext && !step.acessoUrl && (
          <button type="button" onClick={onContinue} className="w-full rounded-xl py-4 text-lg font-semibold text-white" style={{ backgroundColor: accent }}>Continuar</button>
        )}
      </div>
    );
  }

  const mmss = restante == null ? "" : `${String(Math.floor(restante / 3600)).padStart(2, "0")}:${String(Math.floor((restante % 3600) / 60)).padStart(2, "0")}:${String(restante % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {step.timerMinutos > 0 && restante != null && (
        <div className="fixed top-[70px] inset-x-0 z-10 bg-red-600 text-white">
          <div className="max-w-[34rem] mx-auto px-4 py-3 flex items-center gap-4">
            <span className="text-3xl font-extrabold tabular-nums">{mmss}</span>
            <Clock size={28} className="opacity-80 flex-shrink-0" />
            <span className="text-[15px] leading-tight">Oferta válida por tempo limitado</span>
          </div>
        </div>
      )}
      <div className={step.timerMinutos > 0 ? "pt-14" : ""} />

      {step.titulo && <h1 className="text-[26px] font-extrabold leading-tight text-center">{step.titulo}</h1>}

      <div className="flex items-center gap-4">
        {step.produtoImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.produtoImageUrl} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 shadow-md" />
        )}
        <div className="space-y-0.5">
          <p className="text-lg font-semibold text-slate-700">{step.produtoNome}</p>
          {step.precoDe > step.precoPor && <p className="text-red-600 line-through text-[15px]">de {formatBRL(step.precoDe)} por</p>}
          <p className="text-3xl font-extrabold text-green-600">{formatBRL(step.precoPor)}</p>
          {step.cartao && parcelaMax > 1 && (
            <p className="text-slate-600 text-[15px]">ou <b>{parcelaMax}x {formatBRL(totalMax / parcelaMax)}</b>{totalMax > step.precoPor ? "*" : ""}</p>
          )}
        </div>
      </div>

      {(step.compraSegura || step.garantiaDias > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-[15px] font-semibold text-slate-700">
          {step.compraSegura && <span className="flex items-center gap-1.5"><ShieldCheck size={22} className="text-green-600" /> COMPRA 100% SEGURA</span>}
          {step.garantiaDias > 0 && <span className="flex items-center gap-1.5"><ShieldCheck size={22} className="text-green-600" /> GARANTIA DE {step.garantiaDias} DIAS</span>}
        </div>
      )}

      {pix ? (
        <div className="space-y-4 text-center">
          <p className="text-lg font-bold">Pague com Pix para liberar seu acesso</p>
          {pix.qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${pix.qr}`} alt="QR Code Pix" className="w-56 h-56 mx-auto" />
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(pix.payload).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-semibold"
            style={{ borderColor: accent, color: accent }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
          </button>
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Aguardando o pagamento — a confirmação aparece aqui sozinha.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className={inputCls} autoComplete="name" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" className={inputCls} autoComplete="email" />
          <input value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="CPF/CNPJ" inputMode="numeric" className={inputCls} />
          <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Telefone com DDD" inputMode="tel" className={inputCls} autoComplete="tel" />

          {step.pix && step.cartao && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {(["PIX", "CARTAO"] as const).map(m => (
                <button
                  key={m} type="button" onClick={() => setMetodo(m)}
                  className="rounded-xl border-2 py-3 font-semibold"
                  style={metodo === m ? { borderColor: "#16a34a", color: "#16a34a", backgroundColor: "#f0fdf4" } : { borderColor: "#e2e8f0", color: "#475569" }}
                >
                  {m === "PIX" ? "Pix" : "Cartão de crédito"}
                </button>
              ))}
            </div>
          )}

          {metodo === "CARTAO" && (
            <div className="space-y-3">
              <input value={card.number} onChange={e => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} placeholder="Número do cartão" inputMode="numeric" className={inputCls} autoComplete="cc-number" />
              <input value={card.holderName} onChange={e => setCard({ ...card, holderName: e.target.value })} placeholder="Nome impresso no cartão" className={inputCls} autoComplete="cc-name" />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={card.validade}
                  onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setCard({ ...card, validade: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }); }}
                  placeholder="Validade MM/AA" inputMode="numeric" className={inputCls} autoComplete="cc-exp"
                />
                <input value={card.ccv} onChange={e => setCard({ ...card, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="CVV" inputMode="numeric" className={inputCls} autoComplete="cc-csc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={card.postalCode} onChange={e => setCard({ ...card, postalCode: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="CEP" inputMode="numeric" className={inputCls} autoComplete="postal-code" />
                <input value={card.addressNumber} onChange={e => setCard({ ...card, addressNumber: e.target.value.slice(0, 10) })} placeholder="Nº do endereço" className={inputCls} />
              </div>
              {parcelaMax > 1 && (
                <select value={parcelas} onChange={e => setParcelas(Number(e.target.value))} className={inputCls}>
                  {Array.from({ length: parcelaMax }, (_, i) => i + 1).map(n => {
                    const total = checkoutTotal(step, n);
                    return <option key={n} value={n}>{n}x de {formatBRL(total / n)}{total > step.precoPor ? ` (total ${formatBRL(total)})` : " sem juros"}</option>;
                  })}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            type="button" onClick={pagar} disabled={sending}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white bg-green-600 disabled:opacity-60"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
            {sending ? "Processando..." : step.botao || (metodo === "PIX" ? "Gerar Pix" : "Finalizar compra")}
          </button>
          <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1"><Lock size={11} /> Pagamento processado com segurança pelo Asaas</p>
        </div>
      )}
    </div>
  );
}
