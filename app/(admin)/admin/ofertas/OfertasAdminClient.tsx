"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Package, RefreshCw, Save, ShoppingCart, Tag } from "lucide-react";

type Produto = { id: string; slug: string; nome: string; publicado: boolean; inclusoNaPlataforma: boolean; compradores: number; ferramentas: number };
type Papel = "PRINCIPAL" | "ORDER_BUMP" | "UPSELL";
type Item = { produtoId: string; papel: Papel; precoCentavos: number; chamada: string; ordem: number };
type Oferta = { id: string; slug: string; nome: string; ativa: boolean; itens: Item[] };
type Compra = { id: string; createdAt: string; email: string; nome: string; status: string; valorCentavos: number; formaPagamento: string; oferta: string; itens: string[] };

const PAPEL_LABEL: Record<Papel, string> = { PRINCIPAL: "Principal", ORDER_BUMP: "Order bump", UPSELL: "Upsell" };
const STATUS_COR: Record<string, string> = {
  PAGO: "bg-green-500/15 text-green-400", PENDENTE: "bg-amber-500/15 text-amber-300",
  CANCELADO: "bg-gray-800 text-gray-400", REEMBOLSADO: "bg-red-500/15 text-red-300", ESTORNADO: "bg-red-500/15 text-red-300",
};
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OfertaEditor({ oferta, produtos }: { oferta: Oferta; produtos: Produto[] }) {
  const router = useRouter();
  const [ativa, setAtiva] = useState(oferta.ativa);
  const [itens, setItens] = useState(oferta.itens);
  const [precos, setPrecos] = useState(() => Object.fromEntries(oferta.itens.map(i => [i.produtoId, (i.precoCentavos / 100).toFixed(2).replace(".", ",")])));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const nomeProduto = (id: string) => produtos.find(p => p.id === id);
  const fora = produtos.filter(p => !itens.some(i => i.produtoId === p.id));

  async function salvar(novaAtiva = ativa) {
    setMsg(null);
    setSalvando(true);
    const payload = itens.map((i, idx) => ({ ...i, ordem: idx, precoCentavos: Math.round(Number((precos[i.produtoId] ?? "0").replace(/\./g, "").replace(",", ".")) * 100) || 0 }));
    const res = await fetch(`/api/admin/ofertas/${oferta.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativa: novaAtiva, itens: payload }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSalvando(false);
    if (!res?.ok) { setMsg({ ok: false, texto: data?.error ?? "Não foi possível salvar" }); setAtiva(oferta.ativa); return; }
    setAtiva(novaAtiva);
    setMsg({ ok: true, texto: "Salvo." });
    router.refresh();
  }

  const input = "bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-600";
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold flex items-center gap-2"><Tag size={16} /> {oferta.nome}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">/comprar/{oferta.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/comprar/${oferta.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl px-3 py-1.5"><ExternalLink size={14} /> Ver checkout</Link>
          <button
            onClick={() => salvar(!ativa)} disabled={salvando}
            className={`text-sm font-medium rounded-xl px-3 py-1.5 ${ativa ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-300"}`}
            title={ativa ? "Clique para desativar" : "Clique para ativar (o checkout passa a aceitar compras)"}
          >
            {ativa ? "Ativa" : "Inativa"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((it, idx) => {
          const p = nomeProduto(it.produtoId);
          return (
            <div key={it.produtoId} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 space-y-2">
              <div className="grid sm:grid-cols-[1fr_140px_130px_auto] gap-2 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p?.nome ?? it.produtoId}</p>
                  {p && !p.publicado && <p className="text-xs text-amber-300">Rascunho — não aparece no checkout até publicar</p>}
                </div>
                <select value={it.papel} onChange={e => setItens(v => v.map((x, j) => j === idx ? { ...x, papel: e.target.value as Papel } : x))} className={input}>
                  {(Object.keys(PAPEL_LABEL) as Papel[]).map(pp => <option key={pp} value={pp}>{PAPEL_LABEL[pp]}</option>)}
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">R$</span>
                  <input value={precos[it.produtoId] ?? ""} onChange={e => setPrecos(v => ({ ...v, [it.produtoId]: e.target.value.replace(/[^\d,.]/g, "") }))} inputMode="decimal" className={`${input} w-full`} aria-label="Preço" />
                </div>
                <button onClick={() => setItens(v => v.filter((_, j) => j !== idx))} className="text-xs text-red-400 hover:text-red-300 px-2">Remover</button>
              </div>
              {it.papel !== "PRINCIPAL" && (
                <input value={it.chamada} onChange={e => setItens(v => v.map((x, j) => j === idx ? { ...x, chamada: e.target.value } : x))} placeholder="Texto do convite (ex: Leve também o Analisador e descubra...)" className={`${input} w-full`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {fora.length > 0 && (
          <select
            value="" onChange={e => { const id = e.target.value; if (id) { setItens(v => [...v, { produtoId: id, papel: "ORDER_BUMP", precoCentavos: 0, chamada: "", ordem: v.length }]); setPrecos(v => ({ ...v, [id]: "" })); } }}
            className={input}
          >
            <option value="">+ Adicionar produto à oferta</option>
            {fora.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}
        <button onClick={() => salvar()} disabled={salvando} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar oferta
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.texto}</span>}
      </div>
      <p className="text-xs text-gray-500">Os preços daqui são os cobrados no checkout (Asaas). Upsell ainda não aparece no checkout — vem na próxima etapa.</p>
    </section>
  );
}

export function OfertasAdminClient({ produtos, ofertas, compras: comprasIniciais }: { produtos: Produto[]; ofertas: Oferta[]; compras: Compra[] }) {
  const router = useRouter();
  const [compras, setCompras] = useState(comprasIniciais);
  const [sincronizando, setSincronizando] = useState<string | null>(null);

  async function alternarPublicado(p: Produto) {
    await fetch(`/api/admin/infoprodutos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicado: !p.publicado }) });
    router.refresh();
  }

  async function sincronizar(c: Compra) {
    setSincronizando(c.id);
    const res = await fetch(`/api/admin/compras/${c.id}/sincronizar`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.status) setCompras(v => v.map(x => x.id === c.id ? { ...x, status: data.status } : x));
    setSincronizando(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart size={22} /> Infoprodutos e vendas</h1>
        <p className="text-gray-400 text-sm mt-1">Produtos da Minha Biblioteca, ofertas do checkout (Asaas da plataforma) e compras.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Package size={17} /> Produtos</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {produtos.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.nome}</p>
                <p className="text-xs text-gray-500">
                  /biblioteca/{p.slug} · {p.ferramentas} ferramentas · {p.compradores} {p.compradores === 1 ? "acesso" : "acessos"} por compra/admin
                  {p.inclusoNaPlataforma && " · incluso na Plataforma B2B"}
                </p>
              </div>
              <button onClick={() => alternarPublicado(p)} className={`text-xs font-medium rounded-full px-2.5 py-1 ${p.publicado ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                {p.publicado ? "Publicado" : "Rascunho"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Tag size={17} /> Ofertas</h2>
        {ofertas.map(o => <OfertaEditor key={o.id} oferta={o} produtos={produtos} />)}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={17} /> Compras recentes</h2>
        {compras.length === 0 ? (
          <p className="text-sm text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl p-5">Nenhuma compra ainda.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
            {compras.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nome || c.email} <span className="text-gray-500 font-normal">· {c.email}</span></p>
                  <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString("pt-BR")} · {c.formaPagamento} · {c.itens.join(" + ")}</p>
                </div>
                <span className="tabular-nums text-sm">{brl(c.valorCentavos)}</span>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_COR[c.status] ?? "bg-gray-800 text-gray-400"}`}>{c.status}</span>
                <button onClick={() => sincronizar(c)} disabled={sincronizando === c.id} className="p-1.5 text-gray-500 hover:text-white" title="Reconsultar no Asaas" aria-label="Reconsultar no Asaas">
                  <RefreshCw size={14} className={sincronizando === c.id ? "animate-spin" : ""} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
