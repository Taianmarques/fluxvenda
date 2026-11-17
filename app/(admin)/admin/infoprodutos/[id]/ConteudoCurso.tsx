"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, Loader2, Plus, Terminal, Trash2, Video } from "lucide-react";

// Editor das aulas e dos comandos de um módulo (produtos no formato "curso"). Cada item abre um
// formulário próprio; salvar/apagar atualiza a página (router.refresh).

export type AulaAdmin = { id: string; titulo: string; descricao: string; videoUrl: string; duracaoMin: number | null; ordem: number; publicada: boolean };
export type ComandoAdmin = { id: string; titulo: string; descricao: string; texto: string; ordem: number; publicada: boolean };

const input = "w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600";
const label = "text-xs text-gray-500 uppercase tracking-wide";

async function enviar(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  return res?.ok ? null : (data?.error ?? "Não foi possível salvar");
}

function SeloPublicada({ publicada }: { publicada: boolean }) {
  return publicada
    ? <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-green-500/15 text-green-400"><Eye size={11} /> Publicada</span>
    : <span className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-gray-800 text-gray-400"><EyeOff size={11} /> Rascunho</span>;
}

function AulaLinha({ a }: { a: AulaAdmin }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [d, setD] = useState(a);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const set = (p: Partial<AulaAdmin>) => setD(v => ({ ...v, ...p }));

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const e = await enviar(`/api/admin/aulas/${a.id}`, "PATCH", {
      titulo: d.titulo, descricao: d.descricao, videoUrl: d.videoUrl, duracaoMin: d.duracaoMin, ordem: d.ordem, publicada: d.publicada,
    });
    setSalvando(false);
    if (e) { setErro(e); return; }
    setAberta(false);
    router.refresh();
  }
  async function apagar() {
    if (!confirm(`Apagar a aula "${a.titulo}"? O progresso dos alunos nela também é apagado.`)) return;
    const e = await enviar(`/api/admin/aulas/${a.id}`, "DELETE");
    if (e) setErro(e); else router.refresh();
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2.5">
        <span className="w-6 text-xs text-gray-500 tabular-nums text-right">{a.ordem + 1}.</span>
        <Video size={14} className={a.videoUrl ? "text-blue-400" : "text-gray-600"} />
        <p className="min-w-0 flex-1 text-sm truncate">{a.titulo}{a.duracaoMin ? <span className="text-gray-500"> · {a.duracaoMin} min</span> : null}</p>
        {!a.videoUrl && <span className="text-xs text-amber-400">sem vídeo</span>}
        <SeloPublicada publicada={a.publicada} />
        <button onClick={() => setAberta(v => !v)} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2 py-1">{aberta ? "Fechar" : "Editar"}</button>
        <button onClick={apagar} aria-label="Apagar aula" className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      {aberta && (
        <div className="mt-3 ml-8 space-y-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3">
          <div><label className={label}>Título</label><input value={d.titulo} onChange={e => set({ titulo: e.target.value })} maxLength={160} className={`${input} mt-1`} /></div>
          <div>
            <label className={label}>Link do vídeo (Vimeo)</label>
            <input value={d.videoUrl} onChange={e => set({ videoUrl: e.target.value })} placeholder="https://vimeo.com/123456789/abcdef1234" className={`${input} mt-1 font-mono`} />
            <p className="text-xs text-gray-500 mt-1">Vídeo não listado: cole o link completo, com o código depois do número. No Vimeo, permita incorporar no domínio app.fluxvenda.com.br. Também aceita YouTube e .mp4.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Duração (min)</label><input type="number" min={0} max={600} value={d.duracaoMin ?? ""} onChange={e => set({ duracaoMin: e.target.value === "" ? null : Number(e.target.value) })} className={`${input} mt-1`} /></div>
            <div><label className={label}>Ordem</label><input type="number" min={1} value={d.ordem + 1} onChange={e => set({ ordem: Math.max(0, (Number(e.target.value) || 1) - 1) })} className={`${input} mt-1`} /></div>
          </div>
          <div><label className={label}>Descrição / resumo da aula</label><textarea value={d.descricao} onChange={e => set({ descricao: e.target.value })} rows={4} maxLength={5000} className={`${input} mt-1`} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.publicada} onChange={e => set({ publicada: e.target.checked })} /> Publicada (aparece para os alunos)</label>
          <div className="flex items-center gap-3">
            <button onClick={salvar} disabled={salvando} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar aula
            </button>
            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </div>
        </div>
      )}
      {!aberta && erro && <p className="ml-8 mt-1 text-xs text-red-400">{erro}</p>}
    </li>
  );
}

function ComandoLinha({ c }: { c: ComandoAdmin }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [d, setD] = useState(c);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const set = (p: Partial<ComandoAdmin>) => setD(v => ({ ...v, ...p }));

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const e = await enviar(`/api/admin/comandos/${c.id}`, "PATCH", { titulo: d.titulo, descricao: d.descricao, texto: d.texto, ordem: d.ordem, publicada: d.publicada });
    setSalvando(false);
    if (e) { setErro(e); return; }
    setAberto(false);
    router.refresh();
  }
  async function apagar() {
    if (!confirm(`Apagar o comando "${c.titulo}"?`)) return;
    const e = await enviar(`/api/admin/comandos/${c.id}`, "DELETE");
    if (e) setErro(e); else router.refresh();
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2.5">
        <span className="w-6 text-xs text-gray-500 tabular-nums text-right">{c.ordem + 1}.</span>
        <Copy size={14} className="text-blue-400" />
        <p className="min-w-0 flex-1 text-sm truncate">{c.titulo}</p>
        <SeloPublicada publicada={c.publicada} />
        <button onClick={() => setAberto(v => !v)} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2 py-1">{aberto ? "Fechar" : "Editar"}</button>
        <button onClick={apagar} aria-label="Apagar comando" className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      {aberto && (
        <div className="mt-3 ml-8 space-y-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3">
          <div><label className={label}>Título</label><input value={d.titulo} onChange={e => set({ titulo: e.target.value })} maxLength={160} className={`${input} mt-1`} /></div>
          <div><label className={label}>Para que serve (1 frase)</label><input value={d.descricao} onChange={e => set({ descricao: e.target.value })} maxLength={300} className={`${input} mt-1`} /></div>
          <div><label className={label}>Texto do comando (o que o aluno copia)</label><textarea value={d.texto} onChange={e => set({ texto: e.target.value })} rows={8} maxLength={10000} className={`${input} mt-1 font-mono`} /></div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div><label className={label}>Ordem</label><input type="number" min={1} value={d.ordem + 1} onChange={e => set({ ordem: Math.max(0, (Number(e.target.value) || 1) - 1) })} className={`${input} mt-1`} /></div>
            <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={d.publicada} onChange={e => set({ publicada: e.target.checked })} /> Publicado</label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={salvar} disabled={salvando} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar comando
            </button>
            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </div>
        </div>
      )}
      {!aberto && erro && <p className="ml-8 mt-1 text-xs text-red-400">{erro}</p>}
    </li>
  );
}

// Novo item: só o título; o resto se edita depois (nasce como rascunho)
function NovoItem({ placeholder, botao, url, extra }: { placeholder: string; botao: string; url: string; extra?: Record<string, unknown> }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  async function criar() {
    if (!titulo.trim()) return;
    const e = await enviar(url, "POST", { titulo, ...extra });
    if (e) { setErro(e); return; }
    setTitulo("");
    setErro(null);
    router.refresh();
  }
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <input value={titulo} onChange={e => setTitulo(e.target.value)} onKeyDown={e => e.key === "Enter" && criar()} placeholder={placeholder} className={input} />
        <button onClick={criar} disabled={!titulo.trim()} className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"><Plus size={14} /> {botao}</button>
      </div>
      {erro && <p className="mt-1 text-xs text-red-400">{erro}</p>}
    </div>
  );
}

export function ConteudoCurso({ moduloId, aulas, comandos }: { moduloId: string; aulas: AulaAdmin[]; comandos: ComandoAdmin[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4 pl-7">
      <div className="rounded-xl border border-gray-800 p-3">
        <p className="text-sm font-medium flex items-center gap-1.5"><Video size={14} /> Aulas ({aulas.length})</p>
        {aulas.length > 0 && <ul className="mt-1 divide-y divide-gray-800/70">{aulas.map(a => <AulaLinha key={a.id} a={a} />)}</ul>}
        <NovoItem placeholder="Título da nova aula" botao="Aula" url={`/api/admin/modulos/${moduloId}/aulas`} />
      </div>
      <div className="rounded-xl border border-gray-800 p-3">
        <p className="text-sm font-medium flex items-center gap-1.5"><Terminal size={14} /> Comandos prontos ({comandos.length})</p>
        {comandos.length > 0 && <ul className="mt-1 divide-y divide-gray-800/70">{comandos.map(c => <ComandoLinha key={c.id} c={c} />)}</ul>}
        <NovoItem placeholder="Título do novo comando" botao="Comando" url={`/api/admin/modulos/${moduloId}/comandos`} extra={{ texto: "(escreva o comando)" }} />
      </div>
    </div>
  );
}
