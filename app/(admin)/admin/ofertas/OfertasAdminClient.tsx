"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FlaskConical, Loader2, Package, Plus, RefreshCw, RotateCcw, Save, Search, ShoppingCart, Tag, X } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { slugify } from "@/lib/central-shared";

type Produto = { id: string; slug: string; nome: string; publicado: boolean; inclusoNaPlataforma: boolean; capaUrl: string | null; icone: string; acessos: number; modulos: number; ferramentas: number };
type Papel = "PRINCIPAL" | "ORDER_BUMP" | "UPSELL";
type Item = { produtoId: string; papel: Papel; precoCentavos: number; chamada: string; ordem: number };
type Oferta = { id: string; slug: string; nome: string; ativa: boolean; sandbox: boolean; itens: Item[] };
type Compra = { id: string; createdAt: string; email: string; nome: string; status: string; sandbox: boolean; upsell: boolean; valorCentavos: number; formaPagamento: string; oferta: string; itens: string[] };

const PAPEL_LABEL: Record<Papel, string> = { PRINCIPAL: "Principal", ORDER_BUMP: "Order bump", UPSELL: "Upsell" };
const STATUS_COR: Record<string, string> = {
  PAGO: "bg-green-500/15 text-green-400", PENDENTE: "bg-amber-500/15 text-amber-300",
  CANCELADO: "bg-gray-800 text-gray-400", REEMBOLSADO: "bg-red-500/15 text-red-300", ESTORNADO: "bg-red-500/15 text-red-300",
};
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const input = "bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-600";

// Formulário curto de criação (nome + endereço) usado pra produto e oferta
function NovoItem({ rotulo, prefixo, endpoint, aoCriar }: { rotulo: string; prefixo: string; endpoint: string; aoCriar: (data: Record<string, { id: string }>) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    setErro(null);
    setSalvando(true);
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, slug }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSalvando(false);
    if (!res?.ok) { setErro(data?.error ?? "Não foi possível criar"); return; }
    setAberto(false); setNome(""); setSlug(""); setSlugManual(false);
    aoCriar(data);
  }

  if (!aberto) {
    return <button onClick={() => setAberto(true)} className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"><Plus size={15} /> {rotulo}</button>;
  }
  return (
    <div className="flex items-center gap-2 flex-wrap bg-gray-900 border border-gray-800 rounded-xl p-3">
      <input autoFocus value={nome} onChange={e => { setNome(e.target.value); if (!slugManual) setSlug(slugify(e.target.value)); }} placeholder="Nome" className={`${input} min-w-[220px]`} />
      <span className="text-xs text-gray-500">{prefixo}</span>
      <input value={slug} onChange={e => { setSlugManual(true); setSlug(slugify(e.target.value)); }} placeholder="endereco" className={`${input} font-mono w-48`} />
      <button onClick={criar} disabled={salvando || !nome.trim() || !slug} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
        {salvando && <Loader2 size={14} className="animate-spin" />} Criar
      </button>
      <button onClick={() => setAberto(false)} aria-label="Cancelar" className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
      {erro && <p className="w-full text-sm text-red-400">{erro}</p>}
    </div>
  );
}

function OfertaEditor({ oferta, produtos }: { oferta: Oferta; produtos: Produto[] }) {
  const router = useRouter();
  const [ativa, setAtiva] = useState(oferta.ativa);
  const [sandbox, setSandbox] = useState(oferta.sandbox);
  const [itens, setItens] = useState(oferta.itens);
  const [precos, setPrecos] = useState(() => Object.fromEntries(oferta.itens.map(i => [i.produtoId, (i.precoCentavos / 100).toFixed(2).replace(".", ",")])));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const produto = (id: string) => produtos.find(p => p.id === id);
  const fora = produtos.filter(p => !itens.some(i => i.produtoId === p.id));

  async function salvar(extra: { ativa?: boolean; sandbox?: boolean } = {}) {
    setMsg(null);
    setSalvando(true);
    const payload = itens.map((i, idx) => ({ ...i, ordem: idx, precoCentavos: Math.round(Number((precos[i.produtoId] ?? "0").replace(/\./g, "").replace(",", ".")) * 100) || 0 }));
    const res = await fetch(`/api/admin/ofertas/${oferta.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativa, sandbox, ...extra, itens: payload }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSalvando(false);
    if (!res?.ok) { setMsg({ ok: false, texto: data?.error ?? "Não foi possível salvar" }); return; }
    if (extra.ativa !== undefined) setAtiva(extra.ativa);
    if (extra.sandbox !== undefined) setSandbox(extra.sandbox);
    setMsg({ ok: true, texto: "Salvo." });
    router.refresh();
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold flex items-center gap-2"><Tag size={16} /> {oferta.nome}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">/comprar/{oferta.slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/comprar/${oferta.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl px-3 py-1.5"><ExternalLink size={14} /> Ver checkout</Link>
          <button
            onClick={() => salvar({ sandbox: !sandbox })} disabled={salvando}
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-1.5 ${sandbox ? "bg-amber-500/20 text-amber-300" : "bg-gray-800 text-gray-400"}`}
            title="Modo teste: cobra na conta sandbox do Asaas, sem dinheiro real"
          >
            <FlaskConical size={14} /> {sandbox ? "Modo teste" : "Produção"}
          </button>
          <button
            onClick={() => salvar({ ativa: !ativa })} disabled={salvando}
            className={`text-sm font-medium rounded-xl px-3 py-1.5 ${ativa ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-300"}`}
            title={ativa ? "Clique para desativar" : "Clique para ativar (o checkout passa a aceitar compras)"}
          >
            {ativa ? "Ativa" : "Inativa"}
          </button>
        </div>
      </div>
      {sandbox && <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">Modo teste ligado: as compras desta oferta vão para o sandbox do Asaas (sem cobrança real) e aparecem marcadas como TESTE. Os acessos liberados são reais — revogue depois dos testes.</p>}

      <div className="space-y-2">
        {itens.map((it, idx) => {
          const p = produto(it.produtoId);
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
        {itens.length === 0 && <p className="text-sm text-gray-500">Nenhum produto na oferta ainda. Adicione um principal.</p>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {fora.length > 0 && (
          <select
            value="" onChange={e => { const id = e.target.value; if (id) { setItens(v => [...v, { produtoId: id, papel: v.some(x => x.papel === "PRINCIPAL") ? "ORDER_BUMP" : "PRINCIPAL", precoCentavos: 0, chamada: "", ordem: v.length }]); setPrecos(v => ({ ...v, [id]: "" })); } }}
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
      <p className="text-xs text-gray-500">Os preços daqui são os cobrados no checkout (Asaas). O upsell aparece depois da compra confirmada, por até 2 horas, e só cobra com a confirmação do comprador.</p>
    </section>
  );
}

export function OfertasAdminClient({ produtos, ofertas, compras: comprasIniciais }: { produtos: Produto[]; ofertas: Oferta[]; compras: Compra[] }) {
  const router = useRouter();
  const [compras, setCompras] = useState(comprasIniciais);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erroCompra, setErroCompra] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTeste, setFiltroTeste] = useState<"todas" | "reais" | "teste">("todas");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return compras.filter(c =>
      (filtroStatus === "todos" || c.status === filtroStatus) &&
      (filtroTeste === "todas" || (filtroTeste === "teste") === c.sandbox) &&
      (!q || `${c.nome} ${c.email} ${c.itens.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [compras, busca, filtroStatus, filtroTeste]);
  const totalPago = visiveis.filter(c => c.status === "PAGO" && !c.sandbox).reduce((s, c) => s + c.valorCentavos, 0);

  async function alternarPublicado(p: Produto) {
    await fetch(`/api/admin/infoprodutos/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicado: !p.publicado }) });
    router.refresh();
  }

  async function acaoCompra(c: Compra, acao: "sincronizar" | "reembolsar") {
    if (acao === "reembolsar" && !confirm(`Reembolsar ${brl(c.valorCentavos)} para ${c.email}? O valor é estornado no Asaas e o acesso aos produtos desta compra é revogado.`)) return;
    setErroCompra(null);
    setOcupado(c.id);
    const res = await fetch(`/api/admin/compras/${c.id}/${acao}`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) setErroCompra(data?.error ?? "Não foi possível concluir");
    if (data?.status) setCompras(v => v.map(x => x.id === c.id ? { ...x, status: data.status } : x));
    setOcupado(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart size={22} /> Infoprodutos e vendas</h1>
        <p className="text-gray-400 text-sm mt-1">Produtos da Minha Biblioteca, ofertas do checkout (Asaas da plataforma) e compras.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2"><Package size={17} /> Produtos</h2>
          <NovoItem rotulo="Novo produto" prefixo="/biblioteca/" endpoint="/api/admin/infoprodutos" aoCriar={d => router.push(`/admin/infoprodutos/${d.produto.id}`)} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {produtos.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
              <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0 text-blue-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.capaUrl ? <img src={p.capaUrl} alt="" className="w-full h-full object-cover" /> : <CentralIcone nome={p.icone} size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/infoprodutos/${p.id}`} className="font-medium hover:text-blue-400">{p.nome}</Link>
                <p className="text-xs text-gray-500">
                  /biblioteca/{p.slug} · {p.modulos} módulos · {p.ferramentas} ferramentas · {p.acessos} {p.acessos === 1 ? "acesso" : "acessos"}
                  {p.inclusoNaPlataforma && " · incluso na Plataforma B2B"}
                </p>
              </div>
              <Link href={`/admin/infoprodutos/${p.id}`} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2.5 py-1">Editar</Link>
              <button onClick={() => alternarPublicado(p)} className={`text-xs font-medium rounded-full px-2.5 py-1 ${p.publicado ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                {p.publicado ? "Publicado" : "Rascunho"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2"><Tag size={17} /> Ofertas</h2>
          <NovoItem rotulo="Nova oferta" prefixo="/comprar/" endpoint="/api/admin/ofertas" aoCriar={() => router.refresh()} />
        </div>
        {ofertas.map(o => <OfertaEditor key={o.id} oferta={o} produtos={produtos} />)}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={17} /> Compras</h2>
          <p className="text-sm text-gray-400">Pago (sem testes) na lista: <span className="text-white font-medium tabular-nums">{brl(totalPago)}</span></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou produto" className={`${input} w-full pl-8`} />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={input} aria-label="Status">
            <option value="todos">Todos os status</option>
            {Object.keys(STATUS_COR).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroTeste} onChange={e => setFiltroTeste(e.target.value as typeof filtroTeste)} className={input} aria-label="Tipo">
            <option value="todas">Reais e testes</option>
            <option value="reais">Só reais</option>
            <option value="teste">Só testes</option>
          </select>
        </div>
        {erroCompra && <p className="text-sm text-red-400">{erroCompra}</p>}
        {visiveis.length === 0 ? (
          <p className="text-sm text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl p-5">Nenhuma compra{compras.length ? " com esses filtros" : " ainda"}.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
            {visiveis.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {c.nome || c.email} <span className="text-gray-500 font-normal">· {c.email}</span>
                    {c.sandbox && <span className="ml-2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5">TESTE</span>}
                    {c.upsell && <span className="ml-1.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5">UPSELL</span>}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString("pt-BR")} · {c.formaPagamento} · {c.itens.join(" + ")}</p>
                </div>
                <span className="tabular-nums text-sm">{brl(c.valorCentavos)}</span>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_COR[c.status] ?? "bg-gray-800 text-gray-400"}`}>{c.status}</span>
                <button onClick={() => acaoCompra(c, "sincronizar")} disabled={ocupado === c.id} className="p-1.5 text-gray-500 hover:text-white" title="Reconsultar no Asaas" aria-label="Reconsultar no Asaas">
                  <RefreshCw size={14} className={ocupado === c.id ? "animate-spin" : ""} />
                </button>
                {c.status === "PAGO" && (
                  <button onClick={() => acaoCompra(c, "reembolsar")} disabled={ocupado === c.id} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-2 py-1" title="Estornar no Asaas e revogar o acesso desta compra">
                    <RotateCcw size={12} /> Reembolsar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
