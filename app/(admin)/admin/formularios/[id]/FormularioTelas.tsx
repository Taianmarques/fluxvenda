"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X, HelpCircle, FileText, Timer, ShoppingCart, Gauge } from "lucide-react";
import {
  MAX_OPCOES_ESCOLHA, DESTAQUE_CORES, DEFAULT_NIVEIS, MAX_METRICAS,
  type QuizStep, type QuizStepType, type LeadFormQuestion, type QuizResult, type DestaqueCor,
} from "@/lib/lead-form-shared";

// Editor do quiz em telas (LeadForm.style = "TELAS"): sequência de etapas — pergunta, conteúdo,
// carregamento e oferta. As perguntas ficam dentro das etapas; o servidor deriva
// LeadForm.questions delas ao salvar.

const inputCls = "w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600";
const smallLabel = "text-xs text-gray-500";

const TYPE_LABEL: Record<LeadFormQuestion["type"], string> = { TEXTO: "Texto", WHATSAPP: "WhatsApp", EMAIL: "E-mail", NUMERO: "Número", ESCOLHA: "Escolha" };

const STEP_META: Record<QuizStepType, { label: string; icon: React.ReactNode }> = {
  pergunta: { label: "Pergunta", icon: <HelpCircle size={13} /> },
  conteudo: { label: "Conteúdo", icon: <FileText size={13} /> },
  carregamento: { label: "Carregamento", icon: <Timer size={13} /> },
  resultado: { label: "Resultado", icon: <Gauge size={13} /> },
  oferta: { label: "Oferta", icon: <ShoppingCart size={13} /> },
};

const COR_LABEL: Record<DestaqueCor, string> = { vermelho: "Vermelho", verde: "Verde", azul: "Azul", amarelo: "Amarelo" };

function novoId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function novaChave(steps: QuizStep[]): string {
  const keys = new Set(steps.flatMap(s => (s.type === "pergunta" ? [s.question.key] : [])));
  let n = keys.size + 1;
  while (keys.has(`campo${n}`)) n++;
  return `campo${n}`;
}

export function questionsToSteps(questions: LeadFormQuestion[]): QuizStep[] {
  return questions.map((q, i) => ({ id: `s${i + 1}${q.key}`.slice(0, 40), type: "pergunta" as const, question: q }));
}

function novaEtapa(type: QuizStepType, steps: QuizStep[]): QuizStep {
  const id = novoId();
  switch (type) {
    case "pergunta":
      return { id, type, question: { key: novaChave(steps), label: "", type: "ESCOLHA", options: [], layout: "lista" } };
    case "conteudo":
      return { id, type, titulo: "", texto: "", destaqueTitulo: "", destaqueTexto: "", destaqueCor: "vermelho", botao: "Continuar" };
    case "carregamento":
      return { id, type, texto: "Analisando suas respostas...", segundos: 4 };
    case "resultado":
      return {
        id, type, titulo: "Seu resultado", medidorTitulo: "", niveis: [...DEFAULT_NIVEIS],
        compEsquerdaTitulo: "", compEsquerdaTexto: "", compDireitaTitulo: "", compDireitaTexto: "", metricas: [], botao: "Continuar",
      };
    case "oferta":
      return { id, type, titulo: "", texto: "", botao: "Quero agora", url: "", antesLabel: "ANTES", depoisLabel: "DEPOIS" };
  }
}

// Reduz no navegador e guarda no servidor (/api/midia/formulario) — devolve a URL pública
async function uploadImagem(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas indisponível")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/midia/formulario", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== "string") throw new Error(data.error ?? "Não foi possível enviar a imagem.");
  return data.url;
}

export function ImageField({ value, onChange, onError, label = "Imagem" }: {
  value?: string; onChange: (url: string | undefined) => void; onError: (msg: string) => void; label?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImagem(file)); } catch (err) { onError(err instanceof Error ? err.message : "Não deu pra enviar a imagem."); } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-14 w-20 rounded-lg object-cover border border-gray-800" />
      ) : null}
      <label className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400 cursor-pointer">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} {value ? "Trocar" : label}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
      </label>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400" title="Remover"><X size={13} /></button>
      )}
    </div>
  );
}

function OptionImage({ value, onChange, onError }: { value?: string; onChange: (url: string | undefined) => void; onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadImagem(file)); } catch (err) { onError(err instanceof Error ? err.message : "Não deu pra enviar a imagem."); } finally { setBusy(false); }
  }
  return value ? (
    <button type="button" onClick={() => onChange(undefined)} title="Remover foto" className="relative flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value} alt="" className="w-9 h-9 rounded-md object-cover border border-gray-700" />
      <X size={10} className="absolute -top-1 -right-1 bg-red-600 rounded-full text-white" />
    </button>
  ) : (
    <label title="Foto da opção" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md border border-dashed border-gray-700 text-gray-500 hover:text-blue-400 cursor-pointer">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
    </label>
  );
}

function PerguntaEditor({ q, onChange, quizOn, quizResults, onError }: {
  q: LeadFormQuestion; onChange: (q: LeadFormQuestion) => void; quizOn: boolean; quizResults: QuizResult[]; onError: (m: string) => void;
}) {
  const options = q.options ?? [];
  const set = (patch: Partial<LeadFormQuestion>) => onChange({ ...q, ...patch });

  // Renomear opção carrega junto o emoji/foto e a ligação com o resultado do quiz
  function renameOption(i: number, novo: string) {
    const antigo = options[i];
    const opts = options.map((o, idx) => (idx === i ? novo : o));
    const media = { ...(q.optionMedia ?? {}) };
    const results = { ...(q.optionResults ?? {}) };
    if (antigo in media) { media[novo] = media[antigo]; delete media[antigo]; }
    if (antigo in results) { results[novo] = results[antigo]; delete results[antigo]; }
    set({ options: opts, optionMedia: media, optionResults: results });
  }
  function removeOption(i: number) {
    const antigo = options[i];
    const media = { ...(q.optionMedia ?? {}) }; delete media[antigo];
    const results = { ...(q.optionResults ?? {}) }; delete results[antigo];
    set({ options: options.filter((_, idx) => idx !== i), optionMedia: media, optionResults: results });
  }
  function setMedia(opt: string, patch: { emoji?: string; imageUrl?: string }) {
    const cur = { ...(q.optionMedia?.[opt] ?? {}), ...patch };
    if (!cur.emoji) delete cur.emoji;
    if (!cur.imageUrl) delete cur.imageUrl;
    set({ optionMedia: { ...(q.optionMedia ?? {}), [opt]: cur } });
  }
  function setResult(opt: string, key: string) {
    const results = { ...(q.optionResults ?? {}) };
    if (key) results[opt] = key; else delete results[opt];
    set({ optionResults: results });
  }

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-[1fr_140px] gap-2">
        <div>
          <label className={smallLabel}>Pergunta (título da tela)</label>
          <textarea value={q.label} onChange={e => set({ label: e.target.value })} rows={2} maxLength={200} className={inputCls} placeholder="Ex: Com qual frequência você se preocupa com dinheiro?" />
        </div>
        <div>
          <label className={smallLabel}>Tipo</label>
          <select value={q.type} onChange={e => set({ type: e.target.value as LeadFormQuestion["type"] })} className={inputCls}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={smallLabel}>Subtítulo (opcional)</label>
        <input value={q.subtitulo ?? ""} onChange={e => set({ subtitulo: e.target.value || undefined })} maxLength={300} className={inputCls} />
      </div>
      <ImageField value={q.imageUrl} onChange={url => set({ imageUrl: url })} onError={onError} label="Imagem da pergunta" />

      {q.type === "ESCOLHA" && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className={smallLabel}>Opções em</span>
            <select value={q.layout ?? "lista"} onChange={e => set({ layout: e.target.value as "lista" | "grade" })} className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs">
              <option value="lista">Lista (emoji ou ícone)</option>
              <option value="grade">Grade de fotos (2 colunas)</option>
            </select>
          </div>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={q.optionMedia?.[opt]?.emoji ?? ""} onChange={e => setMedia(opt, { emoji: e.target.value })} maxLength={8}
                placeholder="😀" title="Emoji da opção" className="w-12 text-center bg-gray-950 border border-gray-800 rounded-lg px-1 py-2 text-base"
              />
              <OptionImage value={q.optionMedia?.[opt]?.imageUrl} onChange={url => setMedia(opt, { imageUrl: url })} onError={onError} />
              <input value={opt} onChange={e => renameOption(i, e.target.value)} maxLength={60} placeholder={`Opção ${i + 1}`} className="flex-1 min-w-0 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
              {quizOn && (
                <select value={q.optionResults?.[opt] ?? ""} onChange={e => setResult(opt, e.target.value)} className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-2 text-xs w-32 flex-shrink-0" title="Conta para qual resultado do quiz">
                  <option value="">Não pontua</option>
                  {quizResults.map((r, ri) => <option key={r.key} value={r.key}>{r.titulo.trim() || `Resultado ${ri + 1}`}</option>)}
                </select>
              )}
              <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400 flex-shrink-0"><X size={13} /></button>
            </div>
          ))}
          {options.length < MAX_OPCOES_ESCOLHA && (
            <button type="button" onClick={() => set({ options: [...options, ""] })} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
              <Plus size={12} /> Adicionar opção
            </button>
          )}
          <p className="text-[11px] text-gray-500">
            {q.layout === "grade" ? "Na grade, cada opção aparece como um cartão com a foto." : "Na lista, o emoji (ou a foto pequena) aparece à esquerda da opção."} O lead toca e já vai pra próxima tela.
          </p>
        </div>
      )}
      {q.type === "WHATSAPP" && <p className="text-[11px] text-gray-500">Assim que o lead responde, a 1ª mensagem sai no WhatsApp — coloque no começo pra não perder o contato.</p>}
    </div>
  );
}

// Texto cru local (pra dar pra digitar a vírgula); a lista só é atualizada com os itens já completos
function NiveisInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(", "));
  return (
    <input
      value={raw}
      onChange={e => { setRaw(e.target.value); onChange(e.target.value.split(",").map(n => n.trim()).filter(Boolean).slice(0, 7)); }}
      placeholder="Baixo, Normal, Médio, Alto, Muito alto" className={inputCls}
    />
  );
}

export function StepsEditor({ steps, onChange, quizOn, quizResults, onError }: {
  steps: QuizStep[]; onChange: (steps: QuizStep[]) => void; quizOn: boolean; quizResults: QuizResult[]; onError: (m: string) => void;
}) {
  const update = (i: number, s: QuizStep) => onChange(steps.map((x, idx) => (idx === i ? s : x)));
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide">Telas do quiz, em ordem</label>
        <p className="text-xs text-gray-500 mt-1">
          Nos títulos e textos: <span className="font-mono">**negrito**</span>, <span className="font-mono">==cor do formulário==</span>,{" "}
          <span className="font-mono">[vermelho]...[/vermelho]</span>, <span className="font-mono">[verde]...[/verde]</span> e{" "}
          <span className="font-mono">{"{{nome}}"}</span> pro primeiro nome do lead. A imagem de capa (Aparência) vira o logo do topo.
        </p>
      </div>

      {steps.map((s, i) => (
        <div key={s.id} className="bg-gray-950/60 border border-gray-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">{STEP_META[s.type].icon} {STEP_META[s.type].label}</span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"><ArrowUp size={13} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-30"><ArrowDown size={13} /></button>
              <button type="button" onClick={() => onChange(steps.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>

          {s.type === "pergunta" && (
            <PerguntaEditor q={s.question} onChange={q => update(i, { ...s, question: q })} quizOn={quizOn} quizResults={quizResults} onError={onError} />
          )}

          {s.type === "conteudo" && (
            <div className="space-y-2">
              <div>
                <label className={smallLabel}>Título</label>
                <textarea value={s.titulo} onChange={e => update(i, { ...s, titulo: e.target.value })} rows={2} maxLength={400} className={inputCls} />
              </div>
              <ImageField value={s.imageUrl} onChange={url => update(i, { ...s, imageUrl: url })} onError={onError} />
              <div>
                <label className={smallLabel}>Texto</label>
                <textarea value={s.texto} onChange={e => update(i, { ...s, texto: e.target.value })} rows={3} maxLength={2000} className={inputCls} />
              </div>
              <div className="grid sm:grid-cols-[1fr_140px] gap-2">
                <div>
                  <label className={smallLabel}>Caixa de destaque — título (opcional)</label>
                  <input value={s.destaqueTitulo} onChange={e => update(i, { ...s, destaqueTitulo: e.target.value })} maxLength={200} className={inputCls} />
                </div>
                <div>
                  <label className={smallLabel}>Cor da caixa</label>
                  <select value={s.destaqueCor} onChange={e => update(i, { ...s, destaqueCor: e.target.value as DestaqueCor })} className={inputCls}>
                    {DESTAQUE_CORES.map(c => <option key={c} value={c}>{COR_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={smallLabel}>Caixa de destaque — texto (opcional)</label>
                <textarea value={s.destaqueTexto} onChange={e => update(i, { ...s, destaqueTexto: e.target.value })} rows={2} maxLength={1000} className={inputCls} />
              </div>
              <div className="sm:w-1/2">
                <label className={smallLabel}>Texto do botão</label>
                <input value={s.botao} onChange={e => update(i, { ...s, botao: e.target.value })} maxLength={40} placeholder="Continuar" className={inputCls} />
              </div>
            </div>
          )}

          {s.type === "carregamento" && (
            <div className="grid sm:grid-cols-[1fr_120px] gap-2">
              <div>
                <label className={smallLabel}>Texto</label>
                <input value={s.texto} onChange={e => update(i, { ...s, texto: e.target.value })} maxLength={200} className={inputCls} />
              </div>
              <div>
                <label className={smallLabel}>Duração (s)</label>
                <input
                  type="number" min={1} max={15} value={s.segundos}
                  onChange={e => update(i, { ...s, segundos: Math.min(15, Math.max(1, Number(e.target.value) || 1)) })}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {s.type === "oferta" && (
            <div className="space-y-2">
              <div>
                <label className={smallLabel}>Título</label>
                <textarea value={s.titulo} onChange={e => update(i, { ...s, titulo: e.target.value })} rows={2} maxLength={400} placeholder="Ei {{nome}}... o seu plano ficou ==pronto!==" className={inputCls} />
              </div>
              <ImageField value={s.imageUrl} onChange={url => update(i, { ...s, imageUrl: url })} onError={onError} />
              <div>
                <label className={smallLabel}>Texto</label>
                <textarea value={s.texto} onChange={e => update(i, { ...s, texto: e.target.value })} rows={3} maxLength={2000} className={inputCls} />
              </div>
              <div className="grid sm:grid-cols-[1fr_2fr] gap-2">
                <div>
                  <label className={smallLabel}>Texto do botão</label>
                  <input value={s.botao} onChange={e => update(i, { ...s, botao: e.target.value })} maxLength={40} placeholder="Quero agora" className={inputCls} />
                </div>
                <div>
                  <label className={smallLabel}>Link do botão (checkout, página de venda...)</label>
                  <input value={s.url} onChange={e => update(i, { ...s, url: e.target.value })} maxLength={500} placeholder="https://..." className={`${inputCls} font-mono`} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Sem link, o botão só avança pra próxima tela. O link leva junto fbclid e utm.</p>

              <div className="border-t border-gray-800 pt-2 space-y-2">
                <p className={smallLabel}>Antes e depois (opcional) — duas imagens lado a lado</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <input value={s.antesLabel ?? ""} onChange={e => update(i, { ...s, antesLabel: e.target.value })} maxLength={30} placeholder="ANTES" className={inputCls} />
                    <ImageField value={s.antesImageUrl} onChange={url => update(i, { ...s, antesImageUrl: url })} onError={onError} label="Imagem de antes" />
                  </div>
                  <div className="space-y-1">
                    <input value={s.depoisLabel ?? ""} onChange={e => update(i, { ...s, depoisLabel: e.target.value })} maxLength={30} placeholder="DEPOIS" className={inputCls} />
                    <ImageField value={s.depoisImageUrl} onChange={url => update(i, { ...s, depoisImageUrl: url })} onError={onError} label="Imagem de depois" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={Boolean(s.preencher)} onChange={e => update(i, { ...s, preencher: e.target.checked })} />
                  Levar nome, e-mail e telefone do lead pro checkout (já vem preenchido)
                </label>
                {s.preencher && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {([["paramNome", "name"], ["paramEmail", "email"], ["paramTelefone", "phone"]] as const).map(([campo, padrao]) => (
                        <div key={campo}>
                          <label className={smallLabel}>Parâmetro {campo === "paramNome" ? "do nome" : campo === "paramEmail" ? "do e-mail" : "do telefone"}</label>
                          <input value={s[campo] ?? ""} onChange={e => update(i, { ...s, [campo]: e.target.value })} maxLength={40} placeholder={padrao} className={`${inputCls} font-mono`} />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Vazio usa <span className="font-mono">name</span>, <span className="font-mono">email</span> e <span className="font-mono">phone</span> (padrão da maioria dos checkouts). Confira na sua plataforma quais nomes ela aceita. Precisa ter pergunta de e-mail no quiz pra levar o e-mail.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {s.type === "resultado" && (
            <div className="space-y-2">
              <div>
                <label className={smallLabel}>Título</label>
                <textarea value={s.titulo} onChange={e => update(i, { ...s, titulo: e.target.value })} rows={2} maxLength={400} placeholder="Probabilidade de ==ser próspero==:" className={inputCls} />
              </div>
              <p className="text-[11px] text-gray-500">
                Embaixo do título aparecem a imagem e a caixa (título + texto) do resultado do quiz em que o lead caiu — configure isso em cada resultado, no Modo quiz.
              </p>

              <div className="border-t border-gray-800 pt-2 space-y-2">
                <p className={smallLabel}>Medidor de nível (o marcador &quot;Seu nível&quot; vai no nível de cada resultado)</p>
                <input value={s.medidorTitulo} onChange={e => update(i, { ...s, medidorTitulo: e.target.value })} maxLength={120} placeholder="Título do medidor (ex: Probabilidade de enriquecer) — vazio esconde o medidor" className={inputCls} />
                <NiveisInput value={s.niveis} onChange={niveis => update(i, { ...s, niveis })} />
                <p className="text-[11px] text-gray-500">Níveis do mais baixo ao mais alto, separados por vírgula (2 a 7).</p>
              </div>

              <div className="border-t border-gray-800 pt-2 space-y-2">
                <p className={smallLabel}>Comparação em duas colunas (opcional)</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <input value={s.compEsquerdaTitulo} onChange={e => update(i, { ...s, compEsquerdaTitulo: e.target.value })} maxLength={60} placeholder="Esquerda: Bloqueado" className={inputCls} />
                    <textarea value={s.compEsquerdaTexto} onChange={e => update(i, { ...s, compEsquerdaTexto: e.target.value })} rows={2} maxLength={400} placeholder="O padrão diagnosticado com base nas suas respostas" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <input value={s.compDireitaTitulo} onChange={e => update(i, { ...s, compDireitaTitulo: e.target.value })} maxLength={60} placeholder="Direita: Decide romper" className={inputCls} />
                    <textarea value={s.compDireitaTexto} onChange={e => update(i, { ...s, compDireitaTexto: e.target.value })} rows={2} maxLength={400} placeholder="O padrão depois do método" className={inputCls} />
                  </div>
                </div>
                {s.metricas.map((m, mi) => {
                  const setM = (patch: Partial<typeof m>) => update(i, { ...s, metricas: s.metricas.map((x, xi) => (xi === mi ? { ...x, ...patch } : x)) });
                  const pctInput = (v: number, on: (n: number) => void, title: string) => (
                    <input
                      type="number" min={0} max={100} value={v} title={title}
                      onChange={e => on(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-20 bg-gray-950 border border-gray-800 rounded-lg px-2 py-2 text-sm"
                    />
                  );
                  return (
                    <div key={mi} className="flex items-center gap-2">
                      <input value={m.nome} onChange={e => setM({ nome: e.target.value })} maxLength={60} placeholder="Nível de estresse" className="flex-1 min-w-0 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm" />
                      {pctInput(m.esquerda, n => setM({ esquerda: n }), "% na coluna da esquerda")}
                      {pctInput(m.direita, n => setM({ direita: n }), "% na coluna da direita")}
                      <button type="button" onClick={() => update(i, { ...s, metricas: s.metricas.filter((_, xi) => xi !== mi) })} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400"><X size={13} /></button>
                    </div>
                  );
                })}
                {s.metricas.length < MAX_METRICAS && (
                  <button
                    type="button" onClick={() => update(i, { ...s, metricas: [...s.metricas, { nome: "", esquerda: 75, direita: 15 }] })}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <Plus size={12} /> Adicionar barra (nome, % esquerda, % direita)
                  </button>
                )}
              </div>

              <div className="sm:w-1/2">
                <label className={smallLabel}>Texto do botão</label>
                <input value={s.botao} onChange={e => update(i, { ...s, botao: e.target.value })} maxLength={40} placeholder="Continuar" className={inputCls} />
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(STEP_META) as QuizStepType[]).map(t => (
          <button
            key={t} type="button" onClick={() => onChange([...steps, novaEtapa(t, steps)])}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400"
          >
            <Plus size={12} /> {STEP_META[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}
