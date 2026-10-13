"use client";

import { Plus, Trash2, Sparkles } from "lucide-react";
import { MAX_QUIZ_RESULTS, type QuizResult } from "@/lib/lead-form-shared";
import type { CrmFormOptions } from "./FormularioExtras";

// Modo quiz de perfil do editor de formulário: liga/desliga e edita os resultados. A ligação
// opção → resultado fica em cada pergunta de escolha (FormularioEditorClient), porque é lá que
// as opções são digitadas.

const inputCls = "w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600";

export function novoResultado(existentes: QuizResult[]): QuizResult {
  let n = existentes.length + 1;
  while (existentes.some(r => r.key === `r${n}`)) n++;
  return { key: `r${n}`, titulo: "", descricao: "", mensagem: "", etiquetaId: null, pipelineStageId: null, conversionUrl: "" };
}

export function QuizPanel({
  enabled, onToggle, results, onChange, isCrm, crmOptions,
}: {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  results: QuizResult[];
  onChange: (results: QuizResult[]) => void;
  isCrm: boolean;
  crmOptions?: CrmFormOptions;
}) {
  function update(i: number, patch: Partial<QuizResult>) {
    onChange(results.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Sparkles size={12} /> Modo quiz de perfil</p>
          <p className="text-xs text-gray-500 mt-1">
            Cada opção das perguntas de escolha soma um ponto para um resultado; o lead cai no que somar mais. O resultado
            aparece na tela final e define a mensagem do WhatsApp{isCrm ? ", a etiqueta, a etapa" : ""} e a página de conversão.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 flex-shrink-0">
          <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} /> Ativar
        </label>
      </div>

      {enabled && (
        <>
          {results.map((r, i) => (
            <div key={r.key} className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-shrink-0">Resultado {i + 1}</span>
                <input
                  value={r.titulo} onChange={e => update(i, { titulo: e.target.value })} maxLength={80}
                  placeholder="Título (ex: Iniciante)" className={`${inputCls} mt-0 font-semibold`}
                />
                <button
                  type="button" onClick={() => onChange(results.filter((_, idx) => idx !== i))}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400 flex-shrink-0" title="Remover resultado"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500">Texto na tela final</label>
                <textarea
                  value={r.descricao} onChange={e => update(i, { descricao: e.target.value })} rows={2} maxLength={1000}
                  placeholder="O que esse resultado significa e o próximo passo pro lead." className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">1ª mensagem no WhatsApp (vazio = a do formulário)</label>
                <textarea
                  value={r.mensagem} onChange={e => update(i, { mensagem: e.target.value })} rows={2} maxLength={1000}
                  placeholder="Oi, {{nome}}! Seu perfil deu {{resultado}}..." className={inputCls}
                />
              </div>
              <div className={`grid gap-2 ${isCrm && crmOptions ? "sm:grid-cols-3" : ""}`}>
                {isCrm && crmOptions && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Etiqueta</label>
                      <select value={r.etiquetaId ?? ""} onChange={e => update(i, { etiquetaId: e.target.value || null })} className={inputCls}>
                        <option value="">A do formulário</option>
                        {crmOptions.etiquetas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Etapa do pipeline</label>
                      <select value={r.pipelineStageId ?? ""} onChange={e => update(i, { pipelineStageId: e.target.value || null })} className={inputCls}>
                        <option value="">A do formulário</option>
                        {crmOptions.stages.map(s => <option key={s.id} value={s.id}>{s.pipeline} › {s.nome}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs text-gray-500">Página de conversão (vazio = a do formulário)</label>
                  <input
                    value={r.conversionUrl} onChange={e => update(i, { conversionUrl: e.target.value })} maxLength={500}
                    placeholder="https://..." className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
            </div>
          ))}

          {results.length < MAX_QUIZ_RESULTS && (
            <button type="button" onClick={() => onChange([...results, novoResultado(results)])} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
              <Plus size={14} /> Adicionar resultado
            </button>
          )}
          <p className="text-xs text-gray-500">
            Depois, em cada pergunta de escolha abaixo, diga para qual resultado cada opção conta. A pergunta de WhatsApp precisa vir
            depois delas. Use <span className="font-mono">{"{{resultado}}"}</span> nas mensagens para citar o resultado.
          </p>
        </>
      )}
    </div>
  );
}
