"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, CreditCard, Loader2, Lock, QrCode, ShieldCheck } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";

type ProdutoOferta = {
  produtoId: string; precoCentavos: number; nome: string; beneficio: string; descricao: string;
  capaUrl: string | null; icone: string; slug: string;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function mascaraCpfCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

// Checkout dos infoprodutos: principal + order bumps opcionais, dados do comprador e Pix/cartão.
// Os valores mostrados aqui são só pra pessoa conferir — o servidor recalcula tudo pela oferta.
export function CheckoutClient({ ofertaSlug, principais, bumps, logado }: {
  ofertaSlug: string;
  principais: (ProdutoOferta & { jaTem: boolean })[];
  bumps: (ProdutoOferta & { chamada: string })[];
  logado: { nome: string; email: string; telefone: string } | null;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState(logado?.nome ?? "");
  const [email, setEmail] = useState(logado?.email ?? "");
  const [telefone, setTelefone] = useState(logado?.telefone ?? "");
  const [cpf, setCpf] = useState("");
  const [forma, setForma] = useState<"PIX" | "CARTAO">("PIX");
  const [cartao, setCartao] = useState({ holderName: "", number: "", expiry: "", ccv: "", postalCode: "", addressNumber: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [compra, setCompra] = useState<{ id: string; status: string; pix?: { payload: string; imagem: string } } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const aPagar = principais.filter(p => !p.jaTem);
  const itens = useMemo(() => [...aPagar, ...bumps.filter(b => marcados.has(b.produtoId))], [aPagar, bumps, marcados]);
  const total = itens.reduce((s, i) => s + i.precoCentavos, 0);
  const pago = compra?.status === "PAGO";

  // Pix pendente: consulta a compra até confirmar (o servidor confere direto no Asaas)
  useEffect(() => {
    if (!compra || compra.status !== "PENDENTE") return;
    let ativo = true;
    const inicio = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - inicio > 30 * 60 * 1000) { clearInterval(t); return; }
      const res = await fetch(`/api/comprar/status/${compra.id}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (ativo && data?.status && data.status !== "PENDENTE") setCompra(c => (c ? { ...c, status: data.status } : c));
    }, 4000);
    return () => { ativo = false; clearInterval(t); };
  }, [compra]);

  function alternarBump(id: string) {
    setMarcados(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErro(null);
    const [mes, ano] = cartao.expiry.split("/").map(s => s.trim());
    if (forma === "CARTAO" && (!mes || !ano)) { setErro("Informe a validade do cartão no formato MM/AA."); return; }
    setEnviando(true);
    try {
      const res = await fetch(`/api/comprar/${ofertaSlug}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, email, telefone, cpfCnpj: cpf, formaPagamento: forma, bumps: [...marcados],
          ...(forma === "CARTAO" && {
            cartao: { holderName: cartao.holderName, number: cartao.number, expiryMonth: mes.padStart(2, "0"), expiryYear: ano, ccv: cartao.ccv, postalCode: cartao.postalCode, addressNumber: cartao.addressNumber },
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(data.error ?? "Não foi possível concluir. Tente de novo."); return; }
      if (forma === "CARTAO" && data.status !== "PAGO" && data.status !== "PENDENTE") {
        setErro("O pagamento não foi aprovado. Confira os dados do cartão ou tente com Pix.");
        return;
      }
      setCompra({ id: data.compraId, status: data.status, pix: data.pix });
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarPix() {
    if (!compra?.pix) return;
    await navigator.clipboard.writeText(compra.pix.payload).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15";
  const cartaoCls = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

  // ─── Confirmado ───
  if (pago) {
    return (
      <main className="min-h-dvh bg-[#f4f6fb] text-slate-900 flex items-center justify-center p-4">
        <div className={`${cartaoCls} max-w-md w-full p-8 text-center space-y-4`}>
          <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="text-slate-600">Seus produtos já estão liberados:</p>
          <ul className="text-left space-y-1.5">
            {itens.map(i => <li key={i.produtoId} className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-600 flex-shrink-0" /> {i.nome}</li>)}
          </ul>
          {logado ? (
            <Link href="/biblioteca" className="block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white">Ir para a Minha Biblioteca</Link>
          ) : (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
              Enviamos para <strong>{email}</strong> o link para criar sua senha e acessar a <strong>Minha Biblioteca</strong>.
              Já tem conta com esse e-mail? <Link href="/sign-in" className="text-indigo-600 font-medium">Entre aqui</Link>.
            </p>
          )}
        </div>
      </main>
    );
  }

  // ─── Pix gerado, aguardando ───
  if (compra && compra.status === "PENDENTE") {
    return (
      <main className="min-h-dvh bg-[#f4f6fb] text-slate-900 flex items-center justify-center p-4">
        <div className={`${cartaoCls} max-w-md w-full p-6 text-center space-y-4`}>
          <h1 className="text-xl font-bold">{compra.pix ? "Pague com Pix para liberar o acesso" : "Pagamento em análise"}</h1>
          {compra.pix && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${compra.pix.imagem}`} alt="QR Code do Pix" className="mx-auto w-56 h-56" />
              <button onClick={copiarPix} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white">
                {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
              </button>
              <p className="text-2xl font-bold tabular-nums">{brl(total)}</p>
            </>
          )}
          <p className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Aguardando a confirmação do pagamento…</p>
          <p className="text-xs text-slate-400">Esta página atualiza sozinha. O acesso é liberado assim que o banco confirmar.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f4f6fb] text-slate-900">
      <div className="max-w-5xl mx-auto p-4 md:p-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={finalizar} className="space-y-5 min-w-0" id="checkout">
          {/* Produto principal */}
          {principais.map(p => (
            <section key={p.produtoId} className={`${cartaoCls} p-5 flex gap-4`}>
              <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.capaUrl ? <img src={p.capaUrl} alt="" className="w-full h-full object-cover" /> : <CentralIcone nome={p.icone} size={28} />}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight">{p.nome}</h1>
                {p.beneficio && <p className="mt-1 text-sm text-slate-600">{p.beneficio}</p>}
                {p.jaTem
                  ? <p className="mt-2 text-sm font-medium text-emerald-700">Você já tem este produto — ele está na sua Minha Biblioteca.</p>
                  : <p className="mt-2 text-lg font-bold tabular-nums">{brl(p.precoCentavos)}</p>}
              </div>
            </section>
          ))}

          {/* Order bumps */}
          {bumps.map(b => {
            const ativo = marcados.has(b.produtoId);
            return (
              <label key={b.produtoId} className={`block cursor-pointer rounded-2xl border-2 border-dashed p-4 transition-colors ${ativo ? "border-emerald-400 bg-emerald-50/60" : "border-amber-300 bg-amber-50/50 hover:border-amber-400"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={ativo} onChange={() => alternarBump(b.produtoId)} className="mt-1 h-5 w-5 accent-emerald-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">Sim! Quero adicionar o {b.nome} <span className="whitespace-nowrap text-emerald-700">+ {brl(b.precoCentavos)}</span></p>
                    <p className="mt-1 text-sm text-slate-600">{b.chamada || b.beneficio || b.descricao}</p>
                  </div>
                </div>
              </label>
            );
          })}

          {/* Comprador */}
          <section className={`${cartaoCls} p-5 space-y-3`}>
            <h2 className="font-semibold">Seus dados</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="ck-nome" className="text-sm text-slate-700">Nome completo</label>
                <input id="ck-nome" required value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" className={`${input} mt-1`} />
              </div>
              <div>
                <label htmlFor="ck-email" className="text-sm text-slate-700">E-mail (o acesso chega nele)</label>
                <input id="ck-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={`${input} mt-1`} />
              </div>
              <div>
                <label htmlFor="ck-tel" className="text-sm text-slate-700">WhatsApp</label>
                <input id="ck-tel" value={telefone} onChange={e => setTelefone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" className={`${input} mt-1`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ck-cpf" className="text-sm text-slate-700">CPF ou CNPJ</label>
                <input id="ck-cpf" required value={cpf} onChange={e => setCpf(mascaraCpfCnpj(e.target.value))} inputMode="numeric" className={`${input} mt-1`} />
              </div>
            </div>
          </section>

          {/* Pagamento */}
          <section className={`${cartaoCls} p-5 space-y-3`}>
            <h2 className="font-semibold">Pagamento</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
              {([["PIX", "Pix", QrCode], ["CARTAO", "Cartão de crédito", CreditCard]] as const).map(([v, label, Icone]) => (
                <button
                  key={v} type="button" role="radio" aria-checked={forma === v} onClick={() => setForma(v)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${forma === v ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  <Icone size={16} /> {label}
                </button>
              ))}
            </div>
            {forma === "PIX" ? (
              <p className="text-sm text-slate-500">O QR Code aparece na próxima tela. O acesso é liberado assim que o pagamento for confirmado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input required aria-label="Nome impresso no cartão" placeholder="Nome impresso no cartão" value={cartao.holderName} onChange={e => setCartao(c => ({ ...c, holderName: e.target.value }))} autoComplete="cc-name" className={`${input} col-span-2`} />
                <input required aria-label="Número do cartão" placeholder="Número do cartão" inputMode="numeric" value={cartao.number} onChange={e => setCartao(c => ({ ...c, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) }))} autoComplete="cc-number" className={`${input} col-span-2`} />
                <input required aria-label="Validade (MM/AA)" placeholder="Validade (MM/AA)" inputMode="numeric" value={cartao.expiry} onChange={e => setCartao(c => ({ ...c, expiry: e.target.value.replace(/[^\d/]/g, "").slice(0, 7) }))} autoComplete="cc-exp" className={input} />
                <input required aria-label="CVV" placeholder="CVV" inputMode="numeric" value={cartao.ccv} onChange={e => setCartao(c => ({ ...c, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) }))} autoComplete="cc-csc" className={input} />
                <input required aria-label="CEP do titular" placeholder="CEP do titular" inputMode="numeric" value={cartao.postalCode} onChange={e => setCartao(c => ({ ...c, postalCode: e.target.value.replace(/\D/g, "").slice(0, 8) }))} autoComplete="postal-code" className={input} />
                <input required aria-label="Número do endereço" placeholder="Número do endereço" value={cartao.addressNumber} onChange={e => setCartao(c => ({ ...c, addressNumber: e.target.value.slice(0, 10) }))} className={input} />
              </div>
            )}
          </section>
        </form>

        {/* Resumo */}
        <aside className="lg:sticky lg:top-6 self-start space-y-3">
          <section className={`${cartaoCls} p-5 space-y-3`}>
            <h2 className="font-semibold">Resumo do pedido</h2>
            <ul className="space-y-2 text-sm">
              {itens.map(i => (
                <li key={i.produtoId} className="flex justify-between gap-3"><span className="text-slate-600">{i.nome}</span><span className="tabular-nums font-medium">{brl(i.precoCentavos)}</span></li>
              ))}
            </ul>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums">{brl(total)}</span>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button
              type="submit" form="checkout" disabled={enviando || itens.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
              {enviando ? "Processando..." : forma === "PIX" ? "Gerar Pix e finalizar" : "Pagar com cartão"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={13} /> Pagamento processado com segurança pelo Asaas</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
