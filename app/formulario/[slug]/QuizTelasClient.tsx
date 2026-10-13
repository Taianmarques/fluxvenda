"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, MessageCircle } from "lucide-react";
import {
  buildWaLink, withTrackingParams, buildOfertaHref, parseRich, DEFAULT_ACCENT,
  type QuizStep, type LeadFormQuestion, type LeadFormUtm, type DestaqueCor,
} from "@/lib/lead-form-shared";
import { trackPixel, readUtm, registerVisit, MetaPixel } from "./form-runtime";
import { CheckoutTela } from "./CheckoutTela";

// Página pública do formulário no estilo "quiz em telas" (LeadForm.style = "TELAS"): uma etapa por
// tela — pergunta, conteúdo, carregamento ou oferta — com barra de progresso e voltar. Usa a mesma
// API de respostas do estilo conversa (/api/formularios/[slug]/responder), então WhatsApp na hora,
// resultado do quiz, CRM e funil funcionam igual.

const INPUT_MODE: Record<LeadFormQuestion["type"], "text" | "tel" | "email" | "numeric"> = {
  TEXTO: "text", WHATSAPP: "tel", EMAIL: "email", NUMERO: "numeric", ESCOLHA: "text",
};

const DESTAQUE_CLS: Record<DestaqueCor, { box: string; title: string }> = {
  vermelho: { box: "bg-red-50 border-red-200 text-red-700", title: "text-red-600" },
  verde: { box: "bg-green-50 border-green-200 text-green-800", title: "text-green-700" },
  azul: { box: "bg-blue-50 border-blue-200 text-blue-800", title: "text-blue-700" },
  amarelo: { box: "bg-amber-50 border-amber-200 text-amber-800", title: "text-amber-700" },
};

function Rich({ text, nome, accent }: { text: string; nome: string; accent: string }) {
  return (
    <>
      {parseRich(text, nome).map((p, i) => (
        <span
          key={i}
          className={`${p.bold ? "font-extrabold" : ""} ${p.color === "vermelho" ? "text-red-600" : p.color === "verde" ? "text-green-600" : ""}`}
          style={p.color === "accent" ? { color: accent } : undefined}
        >
          {p.text}
        </span>
      ))}
    </>
  );
}

type QuizInfo = { titulo: string; descricao: string; conversionUrl: string | null; nivel?: number | null; imageUrl?: string | null };

// Cor de cada nível do medidor: vermelho (mais baixo) → verde (mais alto)
function corNivel(i: number, total: number): string {
  const hue = total > 1 ? Math.round((i / (total - 1)) * 140) : 140;
  return `hsl(${hue} 75% 48%)`;
}

function Medidor({ titulo, niveis, nivel }: { titulo: string; niveis: string[]; nivel: number | null | undefined }) {
  const pos = nivel ? Math.min(nivel, niveis.length) - 1 : -1;
  return (
    <div className="space-y-2">
      <p className="text-[17px] font-bold">{titulo}</p>
      <div className="relative pt-10">
        <div className="flex gap-1.5">
          {niveis.map((_, i) => <div key={i} className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: corNivel(i, niveis.length) }} />)}
        </div>
        {pos >= 0 && (
          <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${((pos + 0.5) / niveis.length) * 100}%` }}>
            <span className="bg-slate-800 text-white text-xs font-semibold rounded-md px-2 py-1 whitespace-nowrap">Seu nível</span>
            <span className="w-4 h-4 mt-1.5 rounded-full border-[3px] border-blue-600 bg-white" />
          </div>
        )}
        <div className="flex gap-1.5 mt-1.5">
          {niveis.map((n, i) => (
            <span key={i} className={`flex-1 text-[13px] text-center ${i === pos ? "font-bold text-slate-900" : "text-slate-600"}`}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Barra({ nome, pct, cor }: { nome: string; pct: number; cor: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-2 text-[15px] font-medium leading-tight">
        <span>{nome}</span><span className="flex-shrink-0">{pct}%</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-slate-300" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QuizTelasClient({
  slug, steps, pixelId, logoUrl, accentColor, doneMessage, ctaLabel, ctaUrl, waNumber, waButtonText, consentText, conversionUrl,
}: {
  slug: string; steps: QuizStep[]; pixelId: string | null; logoUrl: string | null; accentColor: string | null;
  doneMessage: string; ctaLabel: string | null; ctaUrl: string | null; waNumber: string | null; waButtonText: string | null;
  consentText: string | null; conversionUrl: string | null;
}) {
  const accent = accentColor || DEFAULT_ACCENT;
  const [idx, setIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [value, setValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | undefined>();
  const [inviteSent, setInviteSent] = useState<boolean | undefined>();
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [loadingPct, setLoadingPct] = useState(0);
  // Lida uma vez no navegador (no servidor não há URL do lead; o estado não vai no HTML)
  const [utm] = useState<LeadFormUtm>(() => (typeof window === "undefined" ? {} : readUtm()));
  const topRef = useRef<HTMLDivElement>(null);

  const step = steps[idx];
  const lastQuestionId = [...steps].reverse().find(s => s.type === "pergunta")?.id;
  const nome = answers.nome
    ?? steps.flatMap(s => (s.type === "pergunta" && s.question.type === "TEXTO" ? [answers[s.question.key]] : [])).find(Boolean)
    ?? "";

  // Dados do lead pro checkout preenchido (oferta)
  const respostaDoTipo = (tipo: LeadFormQuestion["type"]) =>
    steps.flatMap(s => (s.type === "pergunta" && s.question.type === tipo ? [answers[s.question.key]] : [])).find(Boolean);
  const leadEmail = respostaDoTipo("EMAIL");
  const leadTelefone = respostaDoTipo("WHATSAPP");

  useEffect(() => {
    registerVisit(slug, utm.source);
  }, [slug, utm.source]);

  useEffect(() => {
    topRef.current?.scrollIntoView();
  }, [idx, finished]);

  // Troca de etapa: limpa o estado da tela e preenche com a resposta anterior (quando o lead volta)
  function goTo(i: number, fim: boolean, respostas = answers) {
    const s = steps[i];
    setError(null);
    setPicked(null);
    setLoadingPct(0);
    setValue(!fim && s?.type === "pergunta" ? respostas[s.question.key] ?? "" : "");
    setIdx(i);
    setFinished(fim);
  }

  function goNext(respostas = answers) {
    if (idx + 1 < steps.length) goTo(idx + 1, false, respostas);
    else goTo(idx, true, respostas);
  }

  function goBack() {
    if (finished) goTo(idx, false);
    else if (idx > 0) goTo(idx - 1, false);
  }

  // Tela de carregamento: barra enche no tempo configurado e avança sozinha
  useEffect(() => {
    if (finished || step?.type !== "carregamento") return;
    const total = step.segundos * 1000;
    const start = Date.now();
    const t = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / total) * 100));
      setLoadingPct(pct);
      if (pct >= 100) { clearInterval(t); setTimeout(() => goNext(), 300); }
    }, 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished]);

  async function answer(q: LeadFormQuestion, raw: string) {
    const v = raw.trim();
    if (!v || sending) return;
    const needsConsent = q.type === "WHATSAPP" && Boolean(consentText);
    if (needsConsent && !consent) { setError("Marque a caixinha de consentimento pra continuar."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/formularios/${slug}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, key: q.key, value: v, ...(needsConsent ? { consent: true } : {}), utm }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok && typeof data.error === "string") {
        setError(data.error);
        setPicked(null);
        return;
      }
      if (typeof data.submissionId === "string") setSubmissionId(data.submissionId);
      if (typeof data.inviteSent === "boolean") setInviteSent(data.inviteSent);
      if (data.quiz && typeof data.quiz === "object") setQuiz(data.quiz as QuizInfo);
    } catch {
      // segue mesmo se o registro falhar — não trava o lead numa tela de erro
    } finally {
      setSending(false);
    }
    const respostas = { ...answers, [q.key]: v };
    setAnswers(respostas);
    if (q.type === "WHATSAPP") trackPixel("Lead");
    if (step?.id === lastQuestionId) trackPixel("CompleteRegistration");
    goNext(respostas);
  }

  function pickOption(q: LeadFormQuestion, opt: string) {
    if (sending) return;
    setPicked(opt);
    setTimeout(() => answer(q, opt), 250); // deixa o lead ver a opção marcada antes de trocar de tela
  }

  // Fim: mesma lógica da tela final do estilo conversa (resultado, botões, página de conversão)
  const destinoConversao = quiz?.conversionUrl || conversionUrl;
  const conversionHref = destinoConversao ? withTrackingParams(destinoConversao, typeof window === "undefined" ? "" : window.location.search) : null;
  useEffect(() => {
    if (!finished || !conversionHref) return;
    const t = setTimeout(() => { window.location.assign(conversionHref); }, pixelId ? 800 : 0);
    return () => clearTimeout(t);
  }, [finished, conversionHref, pixelId]);

  const waLink = waNumber ? buildWaLink(waNumber, "Oi! Acabei de responder o quiz.") : null;
  const inviteFailed = inviteSent === false;
  const progress = finished ? 100 : Math.round(((idx + 1) / (steps.length + 1)) * 100);

  const titleCls = "text-[26px] sm:text-3xl font-extrabold leading-tight tracking-tight text-center text-slate-900 whitespace-pre-line";
  const bottomBtn = (label: string, onClick: () => void, disabled = false) => (
    <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-white via-white to-white/0 pt-6 pb-4 px-4">
      <div className="max-w-[34rem] mx-auto">
        <button
          type="button" onClick={onClick} disabled={disabled}
          className="w-full rounded-xl py-4 text-lg font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {label}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900" ref={topRef}>
      {pixelId && <MetaPixel pixelId={pixelId} />}

      <div className="fixed top-0 inset-x-0 z-20 bg-white">
        <div className="h-1.5 bg-slate-100">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
        </div>
        <div className="max-w-[34rem] mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button" onClick={goBack} aria-label="Voltar"
            className={`p-2 -ml-2 text-slate-700 ${idx === 0 && !finished ? "invisible" : ""}`}
          >
            <ArrowLeft size={22} />
          </button>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="max-h-11 max-w-[180px] object-contain" />
          ) : <span />}
          <span className="w-8" />
        </div>
      </div>

      <main className="max-w-[34rem] mx-auto px-4 pt-24 pb-36">
        {!finished && step?.type === "pergunta" && (() => {
          const q = step.question;
          const grade = q.type === "ESCOLHA" && q.layout === "grade";
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" key={step.id}>
              <h1 className={titleCls}><Rich text={q.label} nome={nome} accent={accent} /></h1>
              {q.subtitulo && (
                <p className="text-center text-[17px] text-slate-600 whitespace-pre-line"><Rich text={q.subtitulo} nome={nome} accent={accent} /></p>
              )}
              {q.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-80" />
              )}

              {q.type === "ESCOLHA" ? (
                <div className={grade ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                  {(q.options ?? []).map(opt => {
                    const media = q.optionMedia?.[opt];
                    const sel = picked === opt || (!picked && answers[q.key] === opt);
                    return grade ? (
                      <button
                        key={opt} type="button" onClick={() => pickOption(q, opt)} disabled={sending}
                        className="rounded-xl border-2 overflow-hidden text-left transition-colors"
                        style={{ borderColor: sel ? accent : "#e2e8f0" }}
                      >
                        {media?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media.imageUrl} alt="" className="w-full aspect-[4/5] object-cover" />
                        ) : media?.emoji ? (
                          <div className="w-full aspect-[4/5] flex items-center justify-center text-6xl bg-slate-50">{media.emoji}</div>
                        ) : null}
                        <div className="px-4 py-3 text-[17px]" style={sel ? { backgroundColor: accent, color: "#fff" } : undefined}>{opt}</div>
                      </button>
                    ) : (
                      <button
                        key={opt} type="button" onClick={() => pickOption(q, opt)} disabled={sending}
                        className="w-full flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left text-[17px] transition-colors"
                        style={sel ? { backgroundColor: accent, borderColor: accent, color: "#fff" } : { borderColor: "#e2e8f0" }}
                      >
                        {media?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                        ) : media?.emoji ? (
                          <span className="text-3xl leading-none flex-shrink-0">{media.emoji}</span>
                        ) : null}
                        <span
                          className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: sel ? "#fff" : "#cbd5e1", backgroundColor: sel ? "#fff" : undefined }}
                        >
                          {sel && <Check size={14} style={{ color: accent }} />}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    value={value} onChange={e => setValue(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") answer(q, value); }}
                    inputMode={INPUT_MODE[q.type]}
                    type={q.type === "EMAIL" ? "email" : "text"}
                    placeholder={q.type === "WHATSAPP" ? "(DDD) 99999-9999" : q.type === "EMAIL" ? "seu@email.com" : "Digite aqui"}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-4 text-lg focus:outline-none"
                    style={{ borderColor: value ? accent : undefined }}
                  />
                  {q.type === "WHATSAPP" && consentText && (
                    <label className="flex items-start gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
                      {consentText}
                    </label>
                  )}
                </div>
              )}
              {error && <p className="text-center text-sm text-red-600">{error}</p>}
              {q.type !== "ESCOLHA" && bottomBtn(sending ? "Enviando..." : "Continuar", () => answer(q, value), sending || !value.trim())}
            </div>
          );
        })()}

        {!finished && step?.type === "conteudo" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" key={step.id}>
            {step.titulo && <h1 className={titleCls}><Rich text={step.titulo} nome={nome} accent={accent} /></h1>}
            {step.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={step.imageUrl} alt="" className="w-full rounded-xl object-cover" />
            )}
            {step.texto && (
              <p className="text-center text-[17px] leading-relaxed text-slate-700 whitespace-pre-line"><Rich text={step.texto} nome={nome} accent={accent} /></p>
            )}
            {(step.destaqueTitulo || step.destaqueTexto) && (
              <div className={`rounded-xl border p-5 space-y-2 ${DESTAQUE_CLS[step.destaqueCor].box}`}>
                {step.destaqueTitulo && (
                  <p className={`text-2xl font-extrabold leading-tight ${DESTAQUE_CLS[step.destaqueCor].title}`}>
                    <Rich text={step.destaqueTitulo} nome={nome} accent={accent} />
                  </p>
                )}
                {step.destaqueTexto && <p className="text-[16px] leading-relaxed whitespace-pre-line"><Rich text={step.destaqueTexto} nome={nome} accent={accent} /></p>}
              </div>
            )}
            {bottomBtn(step.botao || "Continuar", () => goNext())}
          </div>
        )}

        {!finished && step?.type === "carregamento" && (
          <div className="min-h-[50vh] flex flex-col justify-center" key={step.id}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="text-lg font-bold leading-snug"><Rich text={step.texto || "Analisando suas respostas..."} nome={nome} accent={accent} /></p>
              <span className="text-lg font-bold">{loadingPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-100" style={{ width: `${loadingPct}%`, backgroundColor: accent }} />
            </div>
          </div>
        )}

        {!finished && step?.type === "resultado" && (() => {
          const total = step.niveis.length;
          const pos = quiz?.nivel ? Math.min(quiz.nivel, total) : null;
          // Caixa do resultado na cor da faixa: terço de baixo vermelho, meio amarelo, de cima verde
          const faixa = pos == null ? null : pos / total <= 1 / 3 ? "vermelho" : pos / total <= 2 / 3 ? "amarelo" : "verde";
          const boxCls = faixa ? DESTAQUE_CLS[faixa].box : "bg-slate-50 border-slate-200 text-slate-800";
          return (
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-300" key={step.id}>
              {step.titulo && <h1 className={titleCls}><Rich text={step.titulo} nome={nome} accent={accent} /></h1>}
              {quiz?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={quiz.imageUrl} alt="" className="mx-auto max-h-72 rounded-xl object-contain" />
              )}
              {step.medidorTitulo && total >= 2 && <Medidor titulo={step.medidorTitulo} niveis={step.niveis} nivel={pos} />}
              {quiz && (
                <div className={`rounded-xl border p-5 space-y-2 ${boxCls}`}>
                  <p className="text-lg font-extrabold uppercase">{quiz.titulo}</p>
                  {quiz.descricao && <p className="text-[16px] leading-relaxed whitespace-pre-line"><Rich text={quiz.descricao} nome={nome} accent={accent} /></p>}
                </div>
              )}
              {(step.compEsquerdaTitulo || step.compDireitaTitulo) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {([[step.compEsquerdaTitulo, step.compEsquerdaTexto, "text-red-600"], [step.compDireitaTitulo, step.compDireitaTexto, "text-green-600"]] as const).map(([tt, tx, cor], ci) => (
                      <div key={ci} className="rounded-xl border border-slate-200 p-4 text-center space-y-2">
                        <p className={`text-xl font-extrabold leading-tight ${cor}`}>{tt}</p>
                        {tx && <p className="text-[14px] text-slate-500 leading-snug">{tx}</p>}
                      </div>
                    ))}
                  </div>
                  {step.metricas.map((m, mi) => (
                    <div key={mi} className="grid grid-cols-2 gap-4">
                      <Barra nome={m.nome} pct={m.esquerda} cor="#ef4444" />
                      <Barra nome={m.nome} pct={m.direita} cor="#22c55e" />
                    </div>
                  ))}
                </div>
              )}
              {bottomBtn(step.botao || "Continuar", () => goNext())}
            </div>
          );
        })()}

        {!finished && step?.type === "checkout" && (
          <CheckoutTela
            key={step.id} step={step} slug={slug} submissionId={submissionId} accent={accent}
            lead={{ nome: answers.nome ?? nome, email: leadEmail ?? "", telefone: leadTelefone ?? "" }}
            hasNext={idx + 1 < steps.length} onContinue={() => goNext()}
          />
        )}

        {!finished && step?.type === "oferta" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" key={step.id}>
            {step.titulo && <h1 className={titleCls}><Rich text={step.titulo} nome={nome} accent={accent} /></h1>}
            {step.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={step.imageUrl} alt="" className="w-full rounded-xl object-cover" />
            )}
            {(step.antesImageUrl || step.depoisImageUrl) && (
              <div className="grid grid-cols-2 gap-3">
                {([[step.antesLabel || "ANTES", step.antesImageUrl, "text-red-600"], [step.depoisLabel || "DEPOIS", step.depoisImageUrl, "text-green-600"]] as const).map(([lb, img, cor], ci) => (
                  <div key={ci} className="space-y-2 text-center">
                    <p className={`text-2xl font-extrabold ${cor}`}>{lb}</p>
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full rounded-xl object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
            {step.texto && (
              <p className="text-center text-[17px] leading-relaxed text-slate-700 whitespace-pre-line"><Rich text={step.texto} nome={nome} accent={accent} /></p>
            )}
            {step.url
              ? bottomBtn(step.botao || "Quero agora", () => {
                  trackPixel("InitiateCheckout");
                  window.location.assign(buildOfertaHref(step, window.location.search, { nome, email: leadEmail, telefone: leadTelefone }));
                })
              : bottomBtn(step.botao || "Continuar", () => goNext())}
          </div>
        )}

        {finished && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {quiz ? (
              <div className="rounded-2xl border-2 p-6 space-y-2 text-center" style={{ borderColor: accent }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seu resultado</p>
                <p className="text-3xl font-extrabold" style={{ color: accent }}>{quiz.titulo}</p>
                {quiz.descricao && <p className="text-[16px] text-slate-700 leading-relaxed whitespace-pre-line">{quiz.descricao}</p>}
              </div>
            ) : (
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                <Check size={28} className="text-white" />
              </div>
            )}
            <p className="text-center text-[17px] text-slate-700 leading-relaxed whitespace-pre-line">
              {inviteFailed && waLink
                ? "Recebi suas respostas! Não consegui te chamar automaticamente no WhatsApp — toque no botão abaixo pra falar com a gente por lá."
                : inviteFailed
                  ? "Recebi suas respostas! Não consegui te chamar automaticamente no WhatsApp, mas a gente entra em contato assim que possível."
                  : doneMessage}
            </p>
            <div className="flex flex-col gap-3">
              {conversionHref && (
                <a href={conversionHref} className="flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-white" style={{ backgroundColor: accent }}>
                  Continuar <ExternalLink size={16} />
                </a>
              )}
              {!conversionHref && ctaUrl && (
                <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-white" style={{ backgroundColor: accent }}>
                  {ctaLabel || "Acessar"} <ExternalLink size={16} />
                </a>
              )}
              {waLink && (
                <a
                  href={waLink} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold ${inviteFailed || (!ctaUrl && !conversionHref) ? "bg-green-600 text-white" : "border-2 border-green-600 text-green-700"}`}
                >
                  <MessageCircle size={18} /> {waButtonText || "Falar no WhatsApp"}
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
