"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, KeyRound, Layers, Loader2, Plus, Save, Trash2, Users, Wand2 } from "lucide-react";
import { CENTRAL_ICONES, CentralIcone } from "@/lib/central-icons";
import { slugify } from "@/lib/central-shared";
import { ImageField } from "@/app/(admin)/admin/formularios/[id]/FormularioTelas";

type Produto = {
  id: string; slug: string; nome: string; descricao: string; beneficio: string; categoria: string; icone: string;
  capaUrl: string | null; ordem: number; publicado: boolean; precoReferenciaCentavos: number | null;
  inclusoNaPlataforma: boolean; regrasQualidade: boolean; anexoNecessario: string; checkoutRef: string;
};
type Modulo = { id: string; numero: number; nome: string; descricao: string; icone: string; ferramentas: number };
type Acesso = {
  id: string; createdAt: string; origem: string; ativo: boolean; motivo: string | null; nome: string; email: string;
  compra: { status: string; sandbox: boolean; valorCentavos: number } | null;
};

const input = "w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600";
const label = "text-xs text-gray-500 uppercase tracking-wide";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function IconePicker({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.keys(CENTRAL_ICONES).map(nome => (
        <button key={nome} type="button" onClick={() => onChange(nome)} title={nome}
          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${valor === nome ? "border-blue-500 bg-blue-600/15 text-blue-300" : "border-gray-800 text-gray-400 hover:text-white"}`}>
          <CentralIcone nome={nome} size={15} />
        </button>
      ))}
    </div>
  );
}

function ModuloLinha({ m, aoMudar }: { m: Modulo; aoMudar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(m.nome);
  const [descricao, setDescricao] = useState(m.descricao);
  const [icone, setIcone] = useState(m.icone);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    const res = await fetch(`/api/admin/modulos/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, descricao, icone }) });
    if (res.ok) { setEditando(false); aoMudar(); } else setErro("Não foi possível salvar");
  }
  async function apagar() {
    if (!confirm(`Apagar o módulo "${m.nome}"?`)) return;
    const res = await fetch(`/api/admin/modulos/${m.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) aoMudar(); else setErro(data.error ?? "Não foi possível apagar");
  }

  return (
    <li className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <CentralIcone nome={m.icone} size={16} className="text-blue-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{m.nome}</p>
          {m.descricao && <p className="text-xs text-gray-500 truncate">{m.descricao}</p>}
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{m.ferramentas} ferramentas</span>
        <button onClick={() => setEditando(v => !v)} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2 py-1">{editando ? "Fechar" : "Editar"}</button>
        <button onClick={apagar} aria-label="Apagar módulo" className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      {editando && (
        <div className="space-y-2 pl-7">
          <input value={nome} onChange={e => setNome(e.target.value)} className={input} aria-label="Nome do módulo" />
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição curta" className={input} aria-label="Descrição" />
          <IconePicker valor={icone} onChange={setIcone} />
          <button onClick={salvar} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm">Salvar módulo</button>
        </div>
      )}
      {erro && <p className="text-xs text-red-400 pl-7">{erro}</p>}
    </li>
  );
}

export function ProdutoEditorClient({ produto, modulos, acessos }: { produto: Produto; modulos: Modulo[]; acessos: Acesso[] }) {
  const router = useRouter();
  const [d, setD] = useState(produto);
  const [preco, setPreco] = useState(produto.precoReferenciaCentavos != null ? (produto.precoReferenciaCentavos / 100).toFixed(2).replace(".", ",") : "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [novoModulo, setNovoModulo] = useState("");
  const [emailAcesso, setEmailAcesso] = useState("");
  const [msgAcesso, setMsgAcesso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [filtroAcesso, setFiltroAcesso] = useState("");
  const set = (p: Partial<Produto>) => setD(v => ({ ...v, ...p }));

  async function salvar() {
    setMsg(null);
    setSalvando(true);
    const precoCentavos = preco.trim() ? Math.round(Number(preco.replace(/\./g, "").replace(",", ".")) * 100) : null;
    const res = await fetch(`/api/admin/infoprodutos/${produto.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, id: undefined, capaUrl: d.capaUrl ?? "", precoReferenciaCentavos: Number.isFinite(precoCentavos) ? precoCentavos : null }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSalvando(false);
    if (!res?.ok) { setMsg({ ok: false, texto: data?.error ?? "Não foi possível salvar" }); return; }
    setMsg({ ok: true, texto: "Salvo." });
    router.refresh();
  }

  async function criarModulo() {
    if (!novoModulo.trim()) return;
    const res = await fetch(`/api/admin/infoprodutos/${produto.id}/modulos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: novoModulo }) });
    if (res.ok) { setNovoModulo(""); router.refresh(); }
  }

  async function liberarAcesso() {
    setMsgAcesso(null);
    const res = await fetch(`/api/admin/infoprodutos/${produto.id}/acessos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailAcesso }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) { setMsgAcesso({ ok: false, texto: data?.error ?? "Não foi possível liberar" }); return; }
    setMsgAcesso({ ok: true, texto: "Acesso liberado." });
    setEmailAcesso("");
    router.refresh();
  }

  async function alternarAcesso(a: Acesso) {
    if (a.ativo && !confirm(`Revogar o acesso de ${a.email} a este produto${a.compra ? " (só esta fonte — outras compras continuam valendo)" : ""}?`)) return;
    await fetch(`/api/admin/acessos/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: !a.ativo }) });
    router.refresh();
  }

  const acessosVisiveis = acessos.filter(a => !filtroAcesso.trim() || `${a.nome} ${a.email}`.toLowerCase().includes(filtroAcesso.trim().toLowerCase()));
  const ativos = acessos.filter(a => a.ativo).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/ofertas" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"><ArrowLeft size={15} /> Infoprodutos</Link>
        <div className="flex items-center gap-2">
          <Link href={`/biblioteca/${produto.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl px-3 py-2"><ExternalLink size={14} /> Ver na biblioteca</Link>
          <button onClick={salvar} disabled={salvando} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar produto
          </button>
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.texto}</p>}

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={label}>Nome</label><input value={d.nome} onChange={e => set({ nome: e.target.value })} maxLength={120} className={`${input} mt-1`} /></div>
          <div><label className={label}>Endereço (/biblioteca/...)</label><input value={d.slug} onChange={e => set({ slug: slugify(e.target.value) })} maxLength={60} className={`${input} mt-1 font-mono`} /></div>
          <div><label className={label}>Categoria (vitrine)</label><input value={d.categoria} onChange={e => set({ categoria: e.target.value })} maxLength={60} className={`${input} mt-1`} /></div>
          <div><label className={label}>Ordem na vitrine</label><input type="number" min={0} value={d.ordem} onChange={e => set({ ordem: Number(e.target.value) || 0 })} className={`${input} mt-1`} /></div>
        </div>
        <div><label className={label}>Benefício (headline da página do produto e da vitrine)</label><input value={d.beneficio} onChange={e => set({ beneficio: e.target.value })} maxLength={300} className={`${input} mt-1`} /></div>
        <div><label className={label}>Descrição</label><textarea value={d.descricao} onChange={e => set({ descricao: e.target.value })} maxLength={2000} rows={3} className={`${input} mt-1`} /></div>
        <div>
          <label className={label}>Capa</label>
          <div className="mt-1.5 flex items-center gap-4">
            <ImageField value={d.capaUrl ?? undefined} onChange={url => set({ capaUrl: url ?? null })} onError={t => setMsg({ ok: false, texto: t })} label="Capa" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Sem capa, a vitrine mostra o ícone do produto num fundo suave.</p>
        </div>
        <div><label className={label}>Ícone</label><div className="mt-1.5"><IconePicker valor={d.icone} onChange={v => set({ icone: v })} /></div></div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="font-semibold">Configurações</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Preço de referência (R$)</label>
            <input value={preco} onChange={e => setPreco(e.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" placeholder="Ex: 47,00" className={`${input} mt-1`} />
            <p className="text-xs text-gray-500 mt-1">Só informativo. O preço cobrado é o da oferta.</p>
          </div>
          <div>
            <label className={label}>Código no checkout (opcional)</label>
            <input value={d.checkoutRef} onChange={e => set({ checkoutRef: e.target.value })} maxLength={100} placeholder="Ex: SKU-VENDAS-IA" className={`${input} mt-1 font-mono`} />
          </div>
        </div>
        <div>
          <label className={label}>O que anexar na IA (opcional)</label>
          <input value={d.anexoNecessario} onChange={e => set({ anexoNecessario: e.target.value })} maxLength={200} placeholder="Ex: o relatório de vendas (planilha ou PDF)" className={`${input} mt-1`} />
          <p className="text-xs text-gray-500 mt-1">Aparece no passo a passo e na tela do prompt pronto de todas as ferramentas do produto.</p>
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.publicado} onChange={e => set({ publicado: e.target.checked })} /> Publicado (aparece na biblioteca e pode entrar em ofertas)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.inclusoNaPlataforma} onChange={e => set({ inclusoNaPlataforma: e.target.checked })} /> Incluso na Plataforma B2B (quem tem a Plataforma acessa sem comprar)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.regrasQualidade} onChange={e => set({ regrasQualidade: e.target.checked })} /> Acrescentar as regras gerais de qualidade no fim dos prompts (desligue se os prompts já têm regras próprias)</label>
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
          <p className="font-semibold flex items-center gap-2"><Layers size={16} /> Módulos ({modulos.length})</p>
          <Link href="/admin/central" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"><Wand2 size={14} /> Ferramentas e prompts (Central IA)</Link>
        </div>
        {modulos.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500">Nenhum módulo ainda.</p> : (
          <ul className="divide-y divide-gray-800">{modulos.map(m => <ModuloLinha key={m.id} m={m} aoMudar={() => router.refresh()} />)}</ul>
        )}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
          <input value={novoModulo} onChange={e => setNovoModulo(e.target.value)} onKeyDown={e => e.key === "Enter" && criarModulo()} placeholder="Nome do novo módulo" className={input} />
          <button onClick={criarModulo} disabled={!novoModulo.trim()} className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"><Plus size={14} /> Módulo</button>
        </div>
        <p className="px-4 pb-3 text-xs text-gray-500">As ferramentas (prompts e campos) são criadas na Central IA, escolhendo um módulo deste produto.</p>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
          <p className="font-semibold flex items-center gap-2"><Users size={16} /> Compradores e acessos <span className="text-gray-500 font-normal">({ativos} ativos)</span></p>
          {acessos.length > 5 && <input value={filtroAcesso} onChange={e => setFiltroAcesso(e.target.value)} placeholder="Buscar por nome ou e-mail" className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-sm w-60" />}
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 flex-wrap">
          <KeyRound size={15} className="text-gray-500" />
          <input value={emailAcesso} onChange={e => setEmailAcesso(e.target.value)} onKeyDown={e => e.key === "Enter" && liberarAcesso()} placeholder="E-mail da conta para liberar manualmente (cortesia, suporte)" className={`${input} flex-1 min-w-[240px]`} />
          <button onClick={liberarAcesso} disabled={!emailAcesso.trim()} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-2 text-sm disabled:opacity-50">Liberar acesso</button>
          {msgAcesso && <p className={`w-full text-sm ${msgAcesso.ok ? "text-green-400" : "text-red-400"}`}>{msgAcesso.texto}</p>}
        </div>
        {acessosVisiveis.length === 0 ? <p className="px-4 py-4 text-sm text-gray-500">Ninguém com acesso registrado ainda{produto.inclusoNaPlataforma ? " (quem tem a Plataforma B2B acessa sem registro aqui)" : ""}.</p> : (
          <ul className="divide-y divide-gray-800">
            {acessosVisiveis.map(a => (
              <li key={a.id} className={`flex items-center gap-3 px-4 py-2.5 flex-wrap ${a.ativo ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{a.nome} <span className="text-gray-500">· {a.email}</span></p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.createdAt).toLocaleDateString("pt-BR")} · {a.origem === "ADMIN" ? "Liberado pelo admin" : `Compra ${a.compra ? `${brl(a.compra.valorCentavos)} · ${a.compra.status}` : ""}`}
                    {a.compra?.sandbox && " · TESTE"}{!a.ativo && a.motivo ? ` · ${a.motivo}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${a.ativo ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-400"}`}>{a.ativo ? "Ativo" : "Revogado"}</span>
                <button onClick={() => alternarAcesso(a)} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2 py-1">{a.ativo ? "Revogar" : "Restaurar"}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
