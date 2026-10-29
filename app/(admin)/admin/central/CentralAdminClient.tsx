"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Upload, Download, Pencil, Trash2, ExternalLink, Loader2, X } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";

type Modulo = { id: string; numero: number; nome: string; icone: string };
type Linha = { id: string; slug: string; nome: string; descricao: string; icone: string; moduloId: string; publicada: boolean; ordem: number; updatedAt: string; usos: number };

// Meta de ferramentas por módulo (total 100), pela especificação da Central
const META: Record<number, number> = { 1: 10, 2: 10, 3: 15, 4: 15, 5: 10, 6: 10, 7: 10, 8: 10, 9: 5, 10: 5 };

const EXEMPLO_JSON = `[
  {
    "slug": "criador-de-anuncios",
    "moduloId": "anuncios-e-aquisicao",
    "nome": "Criador de anúncios",
    "descricao": "Crie anúncios persuasivos para atrair novos clientes.",
    "objetivo": "Ter 3 versões de anúncio prontas para testar no Instagram/Facebook.",
    "icone": "megaphone",
    "campos": [
      { "key": "produto", "label": "Produto ou serviço do anúncio", "tipo": "texto", "obrigatorio": true },
      { "key": "objetivo", "label": "Qual é o seu objetivo?", "tipo": "select", "opcoes": ["Gerar conversas pelo WhatsApp", "Vender pelo site", "Trazer clientes à loja"], "obrigatorio": true }
    ],
    "prompt": "Crie 3 anúncios para {{produto}} com o objetivo de {{objetivo}}...",
    "instrucoes": "Para cada anúncio: Gancho, Texto do anúncio, Argumento de valor e Chamada para ação.",
    "publicada": false,
    "permitirCopiarPrompt": false,
    "ordem": 1
  }
]`;

export function CentralAdminClient({ modulos, ferramentasIniciais }: { modulos: Modulo[]; ferramentasIniciais: Linha[] }) {
  const router = useRouter();
  const [ferramentas, setFerramentas] = useState(ferramentasIniciais);
  const [importando, setImportando] = useState(false);
  const [json, setJson] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [exportando, setExportando] = useState(false);

  const publicadas = ferramentas.filter(f => f.publicada).length;

  async function alternarPublicada(f: Linha) {
    const publicada = !f.publicada;
    setFerramentas(prev => prev.map(x => x.id === f.id ? { ...x, publicada } : x));
    const res = await fetch(`/api/admin/central/ferramentas/${f.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicada }),
    }).catch(() => null);
    if (!res?.ok) setFerramentas(prev => prev.map(x => x.id === f.id ? { ...x, publicada: !publicada } : x));
  }

  async function apagar(f: Linha) {
    if (!confirm(`Apagar a ferramenta "${f.nome}"? O histórico de gerações dela também será apagado.`)) return;
    setFerramentas(prev => prev.filter(x => x.id !== f.id));
    await fetch(`/api/admin/central/ferramentas/${f.id}`, { method: "DELETE" });
  }

  async function importar() {
    setMsg(null);
    let dados: unknown;
    try { dados = JSON.parse(json); } catch { setMsg({ tipo: "erro", texto: "JSON inválido — confira vírgulas e aspas." }); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/central/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ tipo: "erro", texto: data.error ?? "Não foi possível importar." }); return; }
      setMsg({ tipo: "ok", texto: `${data.criadas} criada(s), ${data.atualizadas} atualizada(s).` });
      setJson("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setJson(await file.text());
  }

  // Exporta tudo (com prompts) no mesmo formato da importação — backup ou edição em lote
  async function exportar() {
    setExportando(true);
    try {
      const res = await fetch("/api/admin/central/ferramentas");
      const data = await res.json();
      const lista = (data.ferramentas ?? []).map((f: Record<string, unknown>) => ({
        slug: f.slug, moduloId: f.moduloId, nome: f.nome, descricao: f.descricao, objetivo: f.objetivo, icone: f.icone,
        campos: f.campos, prompt: f.prompt, instrucoes: f.instrucoes, publicada: f.publicada,
        permitirCopiarPrompt: f.permitirCopiarPrompt, ordem: f.ordem, comoUsar: f.comoUsar, formatoResposta: f.formatoResposta,
        relacionadas: f.relacionadas, acesso: f.acesso, limiteDiario: f.limiteDiario,
      }));
      const blob = new Blob([JSON.stringify(lista, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `central-ferramentas-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench size={22} /> Central de Ferramentas</h1>
          <p className="text-gray-400 text-sm mt-1">
            {ferramentas.length} de 100 ferramentas cadastradas · {publicadas} publicada(s). Prompts e formulários ficam aqui — sem precisar de deploy.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/biblioteca" target="_blank" className="flex items-center gap-2 border border-gray-700 hover:border-blue-600 text-gray-300 rounded-xl px-3.5 py-2.5 text-sm">
            <ExternalLink size={15} /> Ver como usuário
          </Link>
          <button onClick={exportar} disabled={exportando || ferramentas.length === 0} className="flex items-center gap-2 border border-gray-700 hover:border-blue-600 text-gray-300 rounded-xl px-3.5 py-2.5 text-sm disabled:opacity-50">
            {exportando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Exportar JSON
          </button>
          <button onClick={() => { setImportando(v => !v); setMsg(null); }} className="flex items-center gap-2 border border-gray-700 hover:border-blue-600 text-gray-300 rounded-xl px-3.5 py-2.5 text-sm">
            <Upload size={15} /> Importar JSON
          </button>
          <Link href="/admin/central/nova" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium">
            <Plus size={15} /> Nova ferramenta
          </Link>
        </div>
      </div>

      {msg && !importando && <p className={`text-sm ${msg.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.texto}</p>}

      {importando && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Importar ferramentas em lote</p>
              <p className="text-xs text-gray-500 mt-1">
                Lista em JSON no formato abaixo. Ferramentas com o mesmo <code className="text-gray-300">slug</code> são atualizadas; as novas são criadas.
                Módulos válidos: {modulos.map(m => m.id).join(", ")}.
              </p>
            </div>
            <button onClick={() => setImportando(false)} aria-label="Fechar" className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
          </div>
          <textarea
            value={json} onChange={e => setJson(e.target.value)} rows={12} placeholder={EXEMPLO_JSON}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600"
          />
          {msg && <p className={`text-sm ${msg.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.texto}</p>}
          <div className="flex items-center gap-3">
            <button onClick={importar} disabled={enviando || !json.trim()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {enviando && <Loader2 size={15} className="animate-spin" />} Importar
            </button>
            <label className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
              Anexar arquivo .json
              <input type="file" accept=".json,application/json" onChange={anexar} className="hidden" />
            </label>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {modulos.map(m => {
          const doModulo = ferramentas.filter(f => f.moduloId === m.id);
          const meta = META[m.numero] ?? 0;
          return (
            <section key={m.id} className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                <div className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-400 flex items-center justify-center"><CentralIcone nome={m.icone} size={16} /></div>
                <p className="font-semibold flex-1"><span className="text-gray-500 mr-1.5 tabular-nums">{String(m.numero).padStart(2, "0")}</span>{m.nome}</p>
                <span className={`text-xs tabular-nums rounded-full px-2.5 py-1 ${doModulo.length >= meta ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                  {doModulo.length}/{meta}
                </span>
              </div>
              {doModulo.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-500">Nenhuma ferramenta neste módulo ainda.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {doModulo.map(f => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                      <CentralIcone nome={f.icone} size={16} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/central/${f.id}`} className="font-medium hover:text-blue-400">{f.nome}</Link>
                        <p className="text-xs text-gray-500 font-mono truncate">{f.slug} · {f.usos} uso(s)</p>
                      </div>
                      <button
                        onClick={() => alternarPublicada(f)}
                        className={`text-xs font-medium rounded-full px-2.5 py-1 ${f.publicada ? "bg-green-500/15 text-green-400" : "bg-gray-800 text-gray-400"}`}
                        title={f.publicada ? "Clique para despublicar" : "Clique para publicar"}
                      >
                        {f.publicada ? "Publicada" : "Rascunho"}
                      </button>
                      <Link href={`/admin/central/${f.id}`} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400" aria-label="Editar"><Pencil size={15} /></Link>
                      <button onClick={() => apagar(f)} className="p-2 rounded-lg hover:bg-gray-800 text-red-400" aria-label="Apagar"><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
