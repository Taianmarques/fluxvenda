"use client";

import { useEffect, useMemo, useState } from "react";
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

// Máscaras do cartão no padrão de compra: Amex (34/37) tem 15 dígitos em 4-6-5 e CVV de 4;
// Hipercard (606282/3841) pode ter 19; os demais têm 16 dígitos em blocos de 4 e CVV de 3
const soDigitos = (v: string) => v.replace(/\D/g, "");
const ehAmex = (n: string) => /^3[47]/.test(soDigitos(n));
const tamanhoCartao = (n: string) => (ehAmex(n) ? 15 : /^(606282|3841)/.test(soDigitos(n)) ? 19 : 16);
const tamanhoCvv = (n: string) => (ehAmex(n) ? 4 : 3);

function mascaraCartao(v: string) {
  const d = soDigitos(v).slice(0, tamanhoCartao(v));
  if (ehAmex(d)) return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function mascaraValidade(v: string) {
  let d = soDigitos(v).slice(0, 4);
  if (/^[2-9]/.test(d)) d = `0${d}`.slice(0, 4); // "5" vira "05"
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

const mascaraCep = (v: string) => soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

function mascaraTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

// Checkout dos infoprodutos: principal + order bumps opcionais, dados do comprador e Pix/cartão.
// Os valores mostrados aqui são só pra pessoa conferir — o servidor recalcula tudo pela oferta.
export function CheckoutClient({ ofertaSlug, modoTeste, principais, bumps, logado }: {
  ofertaSlug: string;
  modoTeste: boolean; // oferta em sandbox — nenhuma cobrança real
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
  const [compra, setCompra] = useState<{ id: string; status: string; pix?: { payload: string; imagem: string }; upsellToken?: string; acessoToken?: string } | null>(null);
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

  // Pago (na hora no cartão, ou quando o Pix confirma): segue para a página de acesso
  useEffect(() => {
    if (pago && compra?.acessoToken) window.location.assign(`/comprar/acesso/${compra.id}?t=${encodeURIComponent(compra.acessoToken)}`);
  }, [pago, compra]);

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
    if (forma === "CARTAO") {
      if (soDigitos(cartao.number).length !== tamanhoCartao(cartao.number)) { setErro("Confira o número do cartão."); return; }
      if (!mes || !ano || ano.length !== 2 || Number(mes) < 1 || Number(mes) > 12) { setErro("Informe a validade do cartão no formato MM/AA."); return; }
      if (cartao.ccv.length !== tamanhoCvv(cartao.number)) { setErro(`O código de segurança tem ${tamanhoCvv(cartao.number)} dígitos.`); return; }
      if (soDigitos(cartao.postalCode).length !== 8) { setErro("Informe o CEP com 8 dígitos."); return; }
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/comprar/${ofertaSlug}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, email, telefone, cpfCnpj: cpf, formaPagamento: forma, bumps: [...marcados],
          ...(forma === "CARTAO" && {
            cartao: { holderName: cartao.holderName, number: soDigitos(cartao.number), expiryMonth: mes.padStart(2, "0"), expiryYear: ano, ccv: cartao.ccv, postalCode: soDigitos(cartao.postalCode), addressNumber: cartao.addressNumber },
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(data.error ?? "Não foi possível concluir. Tente de novo."); return; }
      if (forma === "CARTAO" && data.status !== "PAGO" && data.status !== "PENDENTE") {
        setErro("O pagamento não foi aprovado. Confira os dados do cartão ou tente com Pix.");
        return;
      }
      setCompra({ id: data.compraId, status: data.status, pix: data.pix, upsellToken: data.upsellToken, acessoToken: data.acessoToken });
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

  // ─── Confirmado: vai para a página de acesso (criar a senha / entrar; o upsell aparece lá) ───
  if (pago) {
    return (
      <main className="min-h-dvh bg-[#f4f6fb] text-slate-900 flex flex-col items-center justify-center gap-4 p-4">
        <div className={`${cartaoCls} max-w-md w-full p-8 text-center space-y-4`}>
          <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="inline-flex items-center gap-2 text-slate-600"><Loader2 size={16} className="animate-spin" /> Abrindo o seu acesso…</p>
          {compra?.acessoToken && (
            <a href={`/comprar/acesso/${compra.id}?t=${encodeURIComponent(compra.acessoToken)}`} className="block text-sm text-indigo-600 font-medium">Não abriu? Clique aqui</a>
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
      {modoTeste && (
        <div className="bg-amber-400 text-amber-950 text-center text-sm font-semibold px-4 py-2">AMBIENTE DE TESTE — pagamentos no sandbox do Asaas, nenhuma cobrança real</div>
      )}
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
                <label htmlFor="ck-email" className="text-sm text-slate-700">E-mail</label>
                <input id="ck-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" aria-describedby="ck-email-dica" className={`${input} mt-1`} />
                <p id="ck-email-dica" className="mt-1 text-xs text-slate-500">Será o seu login de acesso</p>
              </div>
              <div>
                <label htmlFor="ck-tel" className="text-sm text-slate-700">WhatsApp</label>
                <input id="ck-tel" value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" aria-describedby="ck-tel-dica" className={`${input} mt-1`} />
                <p id="ck-tel-dica" className="mt-1 text-xs text-slate-500">Enviamos a confirmação e o acesso por aqui</p>
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
                <input required aria-label="Número do cartão" placeholder="Número do cartão" inputMode="numeric" maxLength={23} value={cartao.number} onChange={e => setCartao(c => { const number = mascaraCartao(e.target.value); return { ...c, number, ccv: c.ccv.slice(0, tamanhoCvv(number)) }; })} autoComplete="cc-number" className={`${input} col-span-2`} />
                <input required aria-label="Validade (MM/AA)" placeholder="Validade (MM/AA)" inputMode="numeric" maxLength={5} value={cartao.expiry} onChange={e => setCartao(c => ({ ...c, expiry: mascaraValidade(e.target.value) }))} autoComplete="cc-exp" className={input} />
                <input required aria-label="Código de segurança (CVV)" placeholder={`CVV (${tamanhoCvv(cartao.number)} dígitos)`} inputMode="numeric" maxLength={4} value={cartao.ccv} onChange={e => setCartao(c => ({ ...c, ccv: soDigitos(e.target.value).slice(0, tamanhoCvv(c.number)) }))} autoComplete="cc-csc" className={input} />
                <input required aria-label="CEP do titular" placeholder="CEP do titular" inputMode="numeric" maxLength={9} value={cartao.postalCode} onChange={e => setCartao(c => ({ ...c, postalCode: mascaraCep(e.target.value) }))} autoComplete="postal-code" className={input} />
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
