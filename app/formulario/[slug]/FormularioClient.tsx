"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { ArrowUp, Check, ExternalLink, MessageCircle } from "lucide-react";
import { buildWaLink, DEFAULT_ACCENT, type LeadFormQuestion, type LeadFormUtm } from "@/lib/lead-form-shared";

export type { LeadFormQuestion };

function BotAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  if (!avatarUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  );
}

type Bubble = { from: "bot" | "user"; text: string };

const INPUT_MODE: Record<LeadFormQuestion["type"], string> = {
  TEXTO: "text",
  WHATSAPP: "tel",
  EMAIL: "email",
  NUMERO: "numeric",
  ESCOLHA: "text",
};

const DEFAULT_DONE =
  "Prontinho! Te chamamos agora no seu WhatsApp com o convite pra testar grátis por 7 dias (ou marcar uma demonstração, se preferir). Fica de olho por lá.";

// Dispara evento pro Meta Pixel, se ele já tiver carregado (formulário sem pixelId não injeta
// o script, então fbq nunca existe — a checagem evita erro nesse caso).
function trackPixel(event: string) {
  if (typeof window !== "undefined" && typeof (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq === "function") {
    (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", event);
  }
}

// Origem do lead: parâmetros do link (utm_*, ref, src) + de que site veio o clique
function readUtm(): LeadFormUtm {
  const p = new URLSearchParams(window.location.search);
  let referrer: string | undefined;
  try { referrer = document.referrer ? new URL(document.referrer).hostname : undefined; } catch { /* referrer inválido */ }
  const clean = (v: string | null) => (v ? v.slice(0, 120) : undefined);
  return {
    source: clean(p.get("utm_source") ?? p.get("ref") ?? p.get("src")),
    medium: clean(p.get("utm_medium")),
    campaign: clean(p.get("utm_campaign")),
    content: clean(p.get("utm_content")),
    referrer: referrer && referrer !== window.location.hostname ? referrer : undefined,
  };
}

export function FormularioClient({
  slug, headline, questions, pixelId, avatarUrl, doneMessage, agentOwned, accentColor, coverUrl,
  ctaLabel, ctaUrl, waNumber, waButtonText, consentText,
}: {
  slug: string; headline: string; questions: LeadFormQuestion[]; pixelId: string | null; avatarUrl: string | null;
  doneMessage: string | null; agentOwned: boolean; accentColor: string | null; coverUrl: string | null;
  ctaLabel: string | null; ctaUrl: string | null; waNumber: string | null; waButtonText: string | null; consentText: string | null;
}) {
  const accent = accentColor || DEFAULT_ACCENT;
  const [bubbles, setBubbles] = useState<Bubble[]>([{ from: "bot", text: headline }]);
  const [step, setStep] = useState(0); // índice da pergunta atual em `questions`
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [inviteSent, setInviteSent] = useState<boolean | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const utmRef = useRef<LeadFormUtm>({});

  const current = questions[step];

  useEffect(() => {
    utmRef.current = readUtm();
    // 1 visita por sessão do navegador — denominador do funil (visitas → respostas)
    try {
      const key = `fv-visita-${slug}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        fetch(`/api/formularios/${slug}/visita`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: utmRef.current.source }),
        }).catch(() => {});
      }
    } catch { /* sessionStorage indisponível (modo privado) — só não conta a visita */ }

    const t1 = setTimeout(() => {
      setBubbles(prev => [...prev, { from: "bot", text: questions[0]?.label ?? "" }]);
      setTimeout(() => setShowInput(true), 250);
    }, 900);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, showInput, done]);

  useEffect(() => {
    if (showInput && current?.type !== "ESCOLHA") inputRef.current?.focus();
  }, [showInput, current]);

  const needsConsent = current?.type === "WHATSAPP" && Boolean(consentText);

  async function handleSubmit(override?: string) {
    const answer = (override ?? value).trim();
    if (!answer || sending || !current) return;
    if (needsConsent && !consent) return;
    setSending(true);
    setBubbles(prev => [...prev, { from: "user", text: answer }]);
    setValue("");
    setShowInput(false);

    const next = step + 1;
    let nextMessage: string | null = null;
    let sent: boolean | undefined;
    try {
      const res = await fetch(`/api/formularios/${slug}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId, key: current.key, value: answer,
          ...(needsConsent ? { consent: true } : {}),
          utm: utmRef.current,
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok && typeof data.error === "string") {
        // Resposta recusada (ex: WhatsApp incompleto) — mostra o motivo e repete a mesma pergunta
        setBubbles(prev => [...prev.slice(0, -1), { from: "bot", text: data.error as string }]);
        setValue(answer);
        setShowInput(true);
        setSending(false);
        return;
      }
      if (typeof data.submissionId === "string") setSubmissionId(data.submissionId);
      nextMessage = typeof data.nextMessage === "string" ? data.nextMessage : null;
      if (typeof data.inviteSent === "boolean") sent = data.inviteSent;
    } catch {
      // segue o fluxo mesmo se o registro falhar — não trava o lead numa tela de erro
    }

    if (current.type === "WHATSAPP") {
      setInviteSent(sent);
      trackPixel("Lead");
    }

    if (next < questions.length) {
      setBubbles(prev => [...prev, { from: "bot", text: nextMessage || questions[next].label }]);
      setStep(next);
      setTimeout(() => setShowInput(true), 250);
      setSending(false);
    } else {
      trackPixel("CompleteRegistration");
      setDone(true);
      setSending(false);
    }
  }

  const waLink = waNumber ? buildWaLink(waNumber, "Oi! Acabei de preencher o formulário.") : null;
  const inviteFailed = inviteSent === false;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {pixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} alt="" />
          </noscript>
        </>
      )}

      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="w-full max-h-48 sm:max-h-64 object-cover flex-shrink-0" />
      )}

      <header className="bg-gray-950 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {agentOwned ? (
            <div className="w-6" />
          ) : (
            <Image src="/iconefluxvenda.png" alt="FluxVenda" width={26} height={26} />
          )}
          <div className="flex items-center gap-2">
            {questions.map((q, i) => {
              const ativo = i === step && !done;
              const feito = i < step || done;
              return (
                <div
                  key={q.key}
                  className={`rounded-full transition-all ${ativo ? "w-2.5 h-2.5 bg-white" : feito ? "w-2 h-2" : "w-2 h-2 border border-gray-600"}`}
                  style={feito && !ativo ? { backgroundColor: accent } : undefined}
                />
              );
            })}
          </div>
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 flex flex-col gap-4">
        {bubbles.map((b, i) =>
          b.from === "bot" ? (
            <div key={i} className="self-start max-w-[85%] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <BotAvatar avatarUrl={avatarUrl} />
              <div className="rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed bg-gray-100 text-gray-900">{b.text}</div>
            </div>
          ) : (
            <div
              key={i}
              className="self-end max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ backgroundColor: accent }}
            >
              {b.text}
            </div>
          )
        )}

        {sending && !showInput && !done && (
          <div className="self-start flex items-center gap-2 animate-in fade-in duration-300">
            <BotAvatar avatarUrl={avatarUrl} />
            <div className="bg-gray-100 rounded-2xl px-5 py-3.5 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}

        {showInput && current && current.type === "ESCOLHA" && (
          <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {(current.options ?? []).map(opt => (
              <button
                key={opt}
                onClick={() => handleSubmit(opt)}
                disabled={sending}
                className="text-left rounded-xl border-2 px-4 py-3 text-[15px] font-medium text-gray-900 hover:text-white transition-colors disabled:opacity-50"
                style={{ borderColor: accent }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ""; }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {showInput && current && current.type !== "ESCOLHA" && (
          <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {current.type === "WHATSAPP" ? "WhatsApp" : current.type === "EMAIL" ? "E-mail" : current.label}
            </p>
            <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-2">
              <input
                ref={inputRef}
                type={current.type === "EMAIL" ? "email" : "text"}
                inputMode={INPUT_MODE[current.type] as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                className="flex-1 text-lg outline-none placeholder:text-gray-300"
                placeholder={current.type === "WHATSAPP" ? "(11) 99999-9999" : "Digite aqui..."}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!value.trim() || sending || (needsConsent && !consent)}
                className="w-9 h-9 rounded-full text-white flex items-center justify-center disabled:opacity-30 flex-shrink-0"
                style={{ backgroundColor: accent }}
              >
                <ArrowUp size={16} />
              </button>
            </div>
            {needsConsent && (
              <label className="flex items-start gap-2 mt-3 text-xs text-gray-500 leading-relaxed cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                <span>{consentText}</span>
              </label>
            )}
          </div>
        )}

        {done && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent }}>
                  <Check size={16} className="text-white" />
                </div>
              )}
              <p className="text-[15px] text-gray-700 leading-relaxed pt-1.5 whitespace-pre-line">
                {inviteFailed && waLink
                  ? "Recebi suas respostas! Não consegui te chamar automaticamente no WhatsApp — toque no botão abaixo pra falar com a gente por lá."
                  : inviteFailed
                    ? "Recebi suas respostas! Não consegui te chamar automaticamente no WhatsApp, mas a gente entra em contato assim que possível."
                    : doneMessage ?? DEFAULT_DONE}
              </p>
            </div>

            {(ctaUrl || waLink) && (
              <div className="flex flex-col sm:flex-row gap-2 pl-12">
                {ctaUrl && (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {ctaLabel || "Acessar"} <ExternalLink size={15} />
                  </a>
                )}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold ${
                      inviteFailed || !ctaUrl ? "bg-green-600 text-white" : "border-2 border-green-600 text-green-700"
                    }`}
                  >
                    <MessageCircle size={16} /> {waButtonText || "Falar no WhatsApp"}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </main>
    </div>
  );
}
