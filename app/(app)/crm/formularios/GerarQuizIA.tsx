"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

// Painel "Criar quiz com IA": o usuário descreve o quiz em texto livre e a IA monta o quiz em
// telas completo (perguntas, resultados, oferta, mensagens). Usado no CRM e no super admin — muda
// só o endpoint e o corpo da requisição. Ao terminar, abre o editor pra ajustar fotos e links.

const EXEMPLO = `Ex: Quiz para a minha clínica de estética. Público: mulheres de 30 a 50 anos que querem tratar manchas e flacidez no rosto. Quero descobrir o tipo de pele e o principal incômodo, e no final oferecer uma avaliação gratuita com desconto no primeiro procedimento.`;

const ETAPAS = ["Entendendo o seu negócio...", "Escrevendo as perguntas...", "Montando os perfis de resultado...", "Preparando a oferta e as mensagens..."];

export function GerarQuizIA({
  endpoint, extraBody, onCreated, onClose,
}: {
  endpoint: string;
  extraBody: Record<string, unknown>; // { modo: "ia" } no CRM, { template: "ia" } no super admin
  onCreated: (formId: string) => void;
  onClose: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [gerando, setGerando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Mensagens de progresso enquanto a IA trabalha (leva perto de 1 minuto)
  useEffect(() => {
    if (!gerando) return;
    const t = setInterval(() => setEtapa(e => Math.min(e + 1, ETAPAS.length - 1)), 12000);
    return () => clearInterval(t);
  }, [gerando]);

  async function gerar() {
    if (gerando) return;
    if (descricao.trim().length < 20) { setError("Descreva com um pouco mais de detalhe: produto, público e o que quer oferecer no final."); return; }
    setError(null);
    setEtapa(0);
    setGerando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extraBody, descricao: descricao.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.form?.id) { setError(data.error ?? "Não foi possível gerar o quiz agora. Tente de novo."); return; }
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
          <p className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-blue-400" /> Criar quiz com IA</p>
          <p className="text-xs text-gray-500 mt-1">
            Descreva o seu negócio, o público e o que quer oferecer no final. A IA monta o quiz em telas completo — perguntas, perfis de resultado, oferta e mensagens do WhatsApp. Depois você só ajusta fotos, links e detalhes.
          </p>
        </div>
        {!gerando && (
          <button onClick={onClose} aria-label="Fechar" className="text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={16} /></button>
        )}
      </div>
      <textarea
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        rows={5}
        maxLength={3000}
        disabled={gerando}
        placeholder={EXEMPLO}
        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 disabled:opacity-60"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={gerar}
          disabled={gerando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {gerando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {gerando ? "Gerando..." : "Gerar quiz"}
        </button>
        {gerando && <span className="text-xs text-gray-400">{ETAPAS[etapa]} pode levar até 1 minuto.</span>}
      </div>
    </div>
  );
}
