"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Eye, Save, AlertTriangle, ExternalLink } from "lucide-react";
import { CENTRAL_ICONES, CentralIcone } from "@/lib/central-icons";
import { ACESSOS, ACESSO_LABEL, CAMPO_TIPOS, PERFIL_CAMPOS, marcacoesDoPrompt, slugify, type AcessoFerramenta, type CampoFerramenta, type PerfilKey } from "@/lib/central-shared";

type Dados = {
  id?: string; slug: string; moduloId: string; nome: string; descricao: string; objetivo: string;
  campos: CampoFerramenta[]; prompt: string; instrucoes: string; icone: string;
  publicada: boolean; permitirCopiarPrompt: boolean; ordem: number;
  comoUsar: string; formatoResposta: string; relacionadas: string[];
  acesso: AcessoFerramenta; limiteDiario: number | null;
};

const TIPO_LABEL: Record<string, string> = { texto: "Texto curto", textarea: "Texto longo", select: "Seleção", numero: "Número" };

export function FerramentaEditorClient({ modulos, todas, inicial }: {
  modulos: { id: string; numero: number; nome: string }[];
  todas: { id: string; slug: string; nome: string; moduloId: string }[];
  inicial: Dados | null;
}) {
  const router = useRouter();
  const [d, setD] = useState<Dados>(inicial ?? {
    slug: "", moduloId: modulos[0]?.id ?? "", nome: "", descricao: "", objetivo: "", campos: [],
    prompt: "", instrucoes: "", icone: "sparkles", publicada: false, permitirCopiarPrompt: true, ordem: 0,
    comoUsar: "", formatoResposta: "", relacionadas: [], acesso: "todos", limiteDiario: null,
  });
  const [addRelacionada, setAddRelacionada] = useState("");
  const [slugManual, setSlugManual] = useState(Boolean(inicial));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [teste, setTeste] = useState<Record<string, string>>({});
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [erroTeste, setErroTeste] = useState<string | null>(null);
  const [sobrando, setSobrando] = useState<string[]>([]); // marcações {{...}} que ficaram sem preencher

  const set = (p: Partial<Dados>) => setD(prev => ({ ...prev, ...p }));
  const setCampo = (i: number, p: Partial<CampoFerramenta>) => set({ campos: d.campos.map((c, j) => j === i ? { ...c, ...p } : c) });

  // Avisos: marcação no prompt sem campo correspondente, e campo que o prompt não usa
  const avisos = useMemo(() => {
    const marcas = marcacoesDoPrompt(d.prompt);
    const keys = new Set(d.campos.map(c => c.key));
    const semCampo = marcas.filter(m => !keys.has(m) && m !== "empresa" && !m.startsWith("empresa."));
    const naoUsados = d.campos.filter(c => !marcas.includes(c.key)).map(c => c.key);
    return { semCampo, naoUsados };
  }, [d.prompt, d.campos]);

  function addCampo() {
    let n = d.campos.length + 1;
    while (d.campos.some(c => c.key === `campo${n}`)) n++;
    set({ campos: [...d.campos, { key: `campo${n}`, label: "", tipo: "texto", obrigatorio: false }] });
  }

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= d.campos.length) return;
    const cs = [...d.campos];
    [cs[i], cs[j]] = [cs[j], cs[i]];
    set({ campos: cs });
  }

  function inserirMarcacao(texto: string) {
    set({ prompt: `${d.prompt}${d.prompt && !d.prompt.endsWith(" ") && !d.prompt.endsWith("\n") ? " " : ""}${texto}` });
  }

  function limparCampos() {
    return d.campos.map(c => ({
      ...c,
      placeholder: c.placeholder?.trim() || undefined,
      ajuda: c.ajuda?.trim() || undefined,
      opcoes: c.tipo === "select" ? (c.opcoes ?? []).map(o => o.trim()).filter(Boolean) : undefined,
      perfil: c.perfil || undefined,
      maxCaracteres: c.tipo === "texto" || c.tipo === "textarea" ? (c.maxCaracteres || undefined) : undefined,
      min: c.tipo === "numero" && c.min != null && !Number.isNaN(c.min) ? c.min : undefined,
      max: c.tipo === "numero" && c.max != null && !Number.isNaN(c.max) ? c.max : undefined,
    }));
  }

  async function salvar() {
    setMsg(null);
    setSalvando(true);
    try {
      const body = { ...d, campos: limparCampos() };
      delete (body as { id?: string }).id;
      const res = await fetch(d.id ? `/api/admin/central/ferramentas/${d.id}` : "/api/admin/central/ferramentas", {
        method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ tipo: "erro", texto: data.error ?? "Não foi possível salvar." }); return; }
      setMsg({ tipo: "ok", texto: "Salvo." });
      if (!d.id && data.ferramenta?.id) router.replace(`/admin/central/${data.ferramenta.id}`);
      else router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setErroTeste(null);
    setResultadoTeste(null);
    setTestando(true);
    try {
      const res = await fetch("/api/admin/central/previa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: d.prompt, instrucoes: d.instrucoes, formatoResposta: d.formatoResposta, campos: limparCampos(), entradas: teste, moduloId: d.moduloId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErroTeste(data.error ?? "Falhou."); return; }
      setResultadoTeste(data.prompt);
      setSobrando(data.sobrando ?? []);
    } finally {
      setTestando(false);
    }
  }

  const inputCls = "w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600";
  const labelCls = "text-xs text-gray-500 uppercase tracking-wide";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/central" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"><ArrowLeft size={15} /> Central de Ferramentas</Link>
        <div className="flex items-center gap-2">
          {d.id && d.publicada && (
            <Link href={`/central/${d.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl px-3 py-2">
              <ExternalLink size={14} /> Ver publicada
            </Link>
          )}
          <button onClick={salvar} disabled={salvando} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
          </button>
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.tipo === "ok" ? "text-green-400" : "text-red-400"}`}>{msg.texto}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5 min-w-0">
          {/* Identificação */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nome comercial</label>
                <input value={d.nome} maxLength={100} onChange={e => set({ nome: e.target.value, ...(slugManual ? {} : { slug: slugify(e.target.value) }) })} className={`${inputCls} mt-1`} />
              </div>
              <div>
                <label className={labelCls}>Identificador (URL)</label>
                <input value={d.slug} maxLength={80} onChange={e => { setSlugManual(true); set({ slug: slugify(e.target.value) }); }} className={`${inputCls} mt-1 font-mono`} />
              </div>
              <div>
                <label className={labelCls}>Módulo</label>
                <select value={d.moduloId} onChange={e => set({ moduloId: e.target.value })} className={`${inputCls} mt-1`}>
                  {modulos.map(m => <option key={m.id} value={m.id}>{String(m.numero).padStart(2, "0")} — {m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ordem no módulo</label>
                <input type="number" min={0} max={1000} value={d.ordem} onChange={e => set({ ordem: Number(e.target.value) || 0 })} className={`${inputCls} mt-1`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descrição (aparece no card)</label>
              <input value={d.descricao} maxLength={300} onChange={e => set({ descricao: e.target.value })} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Objetivo (o que a pessoa recebe)</label>
              <textarea value={d.objetivo} maxLength={600} rows={2} onChange={e => set({ objetivo: e.target.value })} className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Ícone</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.keys(CENTRAL_ICONES).map(nome => (
                  <button
                    key={nome} type="button" onClick={() => set({ icone: nome })} title={nome}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border ${d.icone === nome ? "border-blue-500 bg-blue-600/15 text-blue-300" : "border-gray-800 text-gray-400 hover:text-white"}`}
                  >
                    <CentralIcone nome={nome} size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.publicada} onChange={e => set({ publicada: e.target.checked })} /> Publicada (visível para os clientes)</label>
            </div>
          </section>

          {/* Uso, resposta, acesso e relacionadas */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className={labelCls}>Instruções de uso (o usuário vê em &quot;Como usar&quot;)</label>
              <textarea value={d.comoUsar} maxLength={2000} rows={2} onChange={e => set({ comoUsar: e.target.value })} placeholder="Dicas para preencher bem — ex: cole a fala do cliente do jeito que ele disse" className={`${inputCls} mt-1`} />
            </div>
            <div>
              <label className={labelCls}>Formato esperado da resposta (&quot;Você recebe&quot; — também orienta a IA)</label>
              <textarea value={d.formatoResposta} maxLength={2000} rows={2} onChange={e => set({ formatoResposta: e.target.value })} placeholder="Ex: Cinco respostas naturais e pergunta de diagnóstico." className={`${inputCls} mt-1`} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Quem pode usar</label>
                <select value={d.acesso} onChange={e => set({ acesso: e.target.value as AcessoFerramenta })} className={`${inputCls} mt-1`}>
                  {ACESSOS.map(a => <option key={a} value={a}>{ACESSO_LABEL[a]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Limite de gerações por usuário/dia</label>
                <input
                  type="number" min={1} max={1000} value={d.limiteDiario ?? ""} placeholder="Sem limite"
                  onChange={e => set({ limiteDiario: e.target.value ? Math.max(1, Number(e.target.value)) : null })}
                  className={`${inputCls} mt-1`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Ferramentas relacionadas</label>
              <p className="text-xs text-gray-500 mt-0.5">Vazio = as 3 mais próximas do mesmo módulo, automaticamente.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.relacionadas.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs">
                    {todas.find(t => t.slug === s)?.nome ?? s}
                    <button onClick={() => set({ relacionadas: d.relacionadas.filter(x => x !== s) })} aria-label="Remover" className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </span>
                ))}
              </div>
              {d.relacionadas.length < 8 && (
                <div className="mt-2 flex gap-2">
                  <select value={addRelacionada} onChange={e => setAddRelacionada(e.target.value)} className={inputCls}>
                    <option value="">Escolher ferramenta...</option>
                    {modulos.map(m => (
                      <optgroup key={m.id} label={`${String(m.numero).padStart(2, "0")} — ${m.nome}`}>
                        {todas.filter(t => t.moduloId === m.id && !d.relacionadas.includes(t.slug)).map(t => <option key={t.slug} value={t.slug}>{t.nome}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    onClick={() => { if (addRelacionada) { set({ relacionadas: [...d.relacionadas, addRelacionada] }); setAddRelacionada(""); } }}
                    disabled={!addRelacionada}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-700 px-3 text-sm disabled:opacity-50"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Campos do formulário */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Campos do formulário</p>
                <p className="text-xs text-gray-500">Use a chave no prompt como {"{{chave}}"}. Campo ligado ao perfil chega pré-preenchido.</p>
              </div>
              <button onClick={addCampo} className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"><Plus size={15} /> Campo</button>
            </div>
            {d.campos.length === 0 && <p className="text-sm text-gray-500">Nenhum campo. A ferramenta pode usar só o perfil da empresa ({"{{empresa}}"}).</p>}
            {d.campos.map((c, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 space-y-2">
                <div className="grid sm:grid-cols-[1fr_140px_130px_auto] gap-2 items-center">
                  <input value={c.label} onChange={e => setCampo(i, { label: e.target.value })} placeholder="Rótulo (ex: Produto ou serviço)" className={inputCls} />
                  <input value={c.key} onChange={e => setCampo(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} placeholder="chave" className={`${inputCls} font-mono`} />
                  <select value={c.tipo} onChange={e => setCampo(i, { tipo: e.target.value as CampoFerramenta["tipo"] })} className={inputCls}>
                    {CAMPO_TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                  </select>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => mover(i, -1)} className="p-1.5 text-gray-500 hover:text-white" aria-label="Subir"><ChevronUp size={15} /></button>
                    <button onClick={() => mover(i, 1)} className="p-1.5 text-gray-500 hover:text-white" aria-label="Descer"><ChevronDown size={15} /></button>
                    <button onClick={() => set({ campos: d.campos.filter((_, j) => j !== i) })} className="p-1.5 text-red-400 hover:text-red-300" aria-label="Remover"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={c.placeholder ?? ""} onChange={e => setCampo(i, { placeholder: e.target.value })} placeholder="Exemplo dentro do campo (opcional)" className={inputCls} />
                  <input value={c.ajuda ?? ""} onChange={e => setCampo(i, { ajuda: e.target.value })} placeholder="Texto de ajuda abaixo do campo (opcional)" className={inputCls} />
                </div>
                {c.tipo === "select" && (
                  <textarea
                    value={(c.opcoes ?? []).join("\n")} rows={3} onChange={e => setCampo(i, { opcoes: e.target.value.split("\n") })}
                    placeholder={"Uma opção por linha"} className={inputCls}
                  />
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={c.obrigatorio} onChange={e => setCampo(i, { obrigatorio: e.target.checked })} /> Obrigatório</label>
                  {(c.tipo === "texto" || c.tipo === "textarea") && (
                    <label className="flex items-center gap-2 text-gray-400">
                      Máx. caracteres
                      <input type="number" min={1} max={3000} value={c.maxCaracteres ?? ""} onChange={e => setCampo(i, { maxCaracteres: e.target.value ? Number(e.target.value) : undefined })} placeholder="3000" className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-sm" />
                    </label>
                  )}
                  {c.tipo === "numero" && (
                    <label className="flex items-center gap-2 text-gray-400">
                      Faixa
                      <input type="number" value={c.min ?? ""} onChange={e => setCampo(i, { min: e.target.value ? Number(e.target.value) : undefined })} placeholder="mín" className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-sm" />
                      <input type="number" value={c.max ?? ""} onChange={e => setCampo(i, { max: e.target.value ? Number(e.target.value) : undefined })} placeholder="máx" className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-sm" />
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-gray-400">
                    Preencher com o perfil:
                    <select value={c.perfil ?? ""} onChange={e => setCampo(i, { perfil: (e.target.value || undefined) as PerfilKey | undefined })} className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-sm">
                      <option value="">—</option>
                      {PERFIL_CAMPOS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </section>

          {/* Prompt */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div>
              <p className="font-semibold">Prompt interno</p>
              <p className="text-xs text-gray-500">O usuário nunca vê este texto. Clique numa marcação para inserir no fim.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.campos.map(c => (
                <button key={c.key} onClick={() => inserirMarcacao(`{{${c.key}}}`)} className="text-xs font-mono rounded-md bg-blue-600/15 text-blue-300 px-2 py-1">{`{{${c.key}}}`}</button>
              ))}
              <button onClick={() => inserirMarcacao("{{empresa}}")} className="text-xs font-mono rounded-md bg-gray-800 text-gray-300 px-2 py-1" title="Perfil inteiro da empresa">{"{{empresa}}"}</button>
              {PERFIL_CAMPOS.map(p => (
                <button key={p.key} onClick={() => inserirMarcacao(`{{empresa.${p.key}}}`)} className="text-xs font-mono rounded-md bg-gray-800 text-gray-400 px-2 py-1" title={p.label}>{`{{empresa.${p.key}}}`}</button>
              ))}
            </div>
            <textarea value={d.prompt} onChange={e => set({ prompt: e.target.value })} rows={14} className={`${inputCls} font-mono text-[13px] leading-relaxed`} />
            {(avisos.semCampo.length > 0 || avisos.naoUsados.length > 0) && (
              <div className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 space-y-0.5">
                {avisos.semCampo.length > 0 && <p className="flex items-center gap-1.5"><AlertTriangle size={13} /> Marcação sem campo: {avisos.semCampo.map(m => `{{${m}}}`).join(", ")}</p>}
                {avisos.naoUsados.length > 0 && <p className="flex items-center gap-1.5"><AlertTriangle size={13} /> Campo não usado no prompt: {avisos.naoUsados.join(", ")}</p>}
              </div>
            )}
            <div>
              <label className={labelCls}>Instruções de resposta (formato, tom, regras)</label>
              <textarea value={d.instrucoes} onChange={e => set({ instrucoes: e.target.value })} rows={5} className={`${inputCls} mt-1 text-[13px]`} />
            </div>
          </section>
        </div>

        {/* Teste */}
        <aside className="space-y-3 lg:sticky lg:top-4 self-start">
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Pré-visualizar prompt</p>
            <p className="text-xs text-gray-500">Mostra exatamente o prompt que o cliente vai copiar, com o que está no editor (mesmo sem salvar) e o seu perfil de empresa. Não usa IA.</p>
            {d.campos.map(c => (
              <div key={c.key}>
                <label className="text-xs text-gray-400">{c.label || c.key}</label>
                {c.tipo === "select" ? (
                  <select value={teste[c.key] ?? ""} onChange={e => setTeste(t => ({ ...t, [c.key]: e.target.value }))} className={`${inputCls} mt-1`}>
                    <option value="">Selecione...</option>
                    {(c.opcoes ?? []).filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <textarea value={teste[c.key] ?? ""} rows={c.tipo === "textarea" ? 2 : 1} onChange={e => setTeste(t => ({ ...t, [c.key]: e.target.value }))} placeholder={c.placeholder} className={`${inputCls} mt-1 resize-y`} />
                )}
              </div>
            ))}
            {erroTeste && <p className="text-sm text-red-400">{erroTeste}</p>}
            <button onClick={testar} disabled={testando || !d.prompt.trim()} className="w-full inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {testando ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} {testando ? "Montando..." : "Pré-visualizar"}
            </button>
          </section>
          {resultadoTeste && (
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
              {sobrando.length > 0 && (
                <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Ficou sem preencher: {sobrando.map(s => `{{${s}}}`).join(", ")}</p>
              )}
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-300 font-mono max-h-[60vh] overflow-y-auto">{resultadoTeste}</pre>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
