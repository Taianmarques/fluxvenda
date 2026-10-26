"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, X } from "lucide-react";

// Painel "Transformar roteiro em quiz": o usuário cola (ou anexa em .txt/.md) o roteiro/prompt do
// quiz que ele já tem — perguntas, opções, resultados — e a IA converte fielmente pro quiz em telas.
// Não cria do zero: só completa o que faltar pro quiz funcionar. Usado no CRM e no super admin
// (muda só o endpoint e o corpo). Ao terminar, abre o editor pra ajustar fotos e links.

const EXEMPLO = `Cole aqui o roteiro do seu quiz. Ex:

Título: Descubra o seu perfil de investidor
Pergunta 1: Quando o mercado cai, o que você faz?
- Vendo tudo (Conservador)
- Espero passar (Moderado)
- Compro mais (Arrojado)
Pergunta 2: ...

Resultados:
Conservador — prioriza segurança...
Moderado — ...
Oferta final: consultoria gratuita de 30 min`;

const ETAPAS = ["Lendo o seu roteiro...", "Montando as perguntas e opções...", "Ligando as opções aos resultados...", "Preparando a oferta e as mensagens..."];
const MAX = 20000;

export function GerarQuizIA({
  endpoint, extraBody, onCreated, onClose,
}: {
  endpoint: string;
  extraBody: Record<string, unknown>; // { modo: "ia" } no CRM, { template: "ia" } no super admin
  onCreated: (formId: string) => void;
  onClose: () => void;
}) {
  const [material, setMaterial] = useState("");
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mensagens de progresso enquanto a IA trabalha (leva perto de 1 minuto)
  useEffect(() => {
    if (!gerando) return;
    const t = setInterval(() => setEtapa(e => Math.min(e + 1, ETAPAS.length - 1)), 12000);
    return () => clearInterval(t);
  }, [gerando]);

  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.(txt|md|markdown)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setError("Anexe um arquivo de texto (.txt ou .md). Se o roteiro estiver em Word ou PDF, copie e cole o texto aqui.");
      return;
    }
    const texto = await file.text();
    if (texto.length > MAX) { setError(`O arquivo tem mais de ${MAX.toLocaleString("pt-BR")} caracteres.`); return; }
    setMaterial(texto);
    setArquivo(file.name);
    setError(null);
  }

  async function gerar() {
    if (gerando) return;
    if (material.trim().length < 20) { setError("Cole o roteiro do quiz (perguntas, opções e resultados) ou anexe o arquivo."); return; }
    setError(null);
    setEtapa(0);
    setGerando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extraBody, descricao: material.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.form?.id) { setError(data.error ?? "Não foi possível transformar o roteiro agora. Tente de novo."); return; }
      onCreated(data.form.id);
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Transformar roteiro em quiz</p>
          <p className="text-xs text-gray-500 mt-1">
            Cole ou anexe o roteiro do quiz que você já tem (perguntas, opções, resultados e oferta). A IA converte do jeito que está escrito
            no quiz em telas e só completa o que faltar — emojis, ligação das opções com os resultados e mensagens do WhatsApp. Depois você ajusta fotos e links.
          </p>
        </div>
        {!gerando && (
          <button onClick={onClose} aria-label="Fechar" className="text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={16} /></button>
        )}
      </div>
      <textarea
        value={material}
        onChange={e => { setMaterial(e.target.value); setArquivo(null); }}
        rows={9}
        maxLength={MAX}
        disabled={gerando}
        placeholder={EXEMPLO}
        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-600 disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{arquivo ? `Arquivo: ${arquivo}` : "Ou anexe um arquivo .txt / .md"}</span>
        <span className="tabular-nums">{material.length.toLocaleString("pt-BR")} / {MAX.toLocaleString("pt-BR")}</span>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={gerar}
          disabled={gerando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {gerando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {gerando ? "Transformando..." : "Transformar em quiz"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={gerando}
          className="flex items-center gap-2 border border-gray-700 hover:border-blue-600 text-gray-300 hover:text-blue-400 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          <FileUp size={15} /> Anexar arquivo
        </button>
        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={anexar} className="hidden" />
        {gerando && <span className="text-xs text-gray-400">{ETAPAS[etapa]} pode levar até 1 minuto.</span>}
      </div>
    </div>
  );
}
