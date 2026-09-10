"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import { ArrowUp, Check } from "lucide-react";

export type LeadFormQuestion = { key: string; label: string; type: "TEXTO" | "WHATSAPP" | "EMAIL" | "NUMERO" };

type Bubble = { from: "bot" | "user"; text: string };

const INPUT_MODE: Record<LeadFormQuestion["type"], string> = {
  TEXTO: "text",
  WHATSAPP: "tel",
  EMAIL: "email",
  NUMERO: "numeric",
};

// Dispara evento pro Meta Pixel, se ele já tiver carregado (formulário sem pixelId não injeta
// o script, então fbq nunca existe — a checagem evita erro nesse caso).
function trackPixel(event: string) {
  if (typeof window !== "undefined" && typeof (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq === "function") {
    (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", event);
  }
}

export function FormularioClient({ slug, headline, questions, pixelId }: { slug: string; headline: string; questions: LeadFormQuestion[]; pixelId: string | null }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [step, setStep] = useState(0); // índice da pergunta atual em `questions`
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");
  const [submissionId, setSubmissionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const current = questions[step];

  useEffect(() => {
    setBubbles([{ from: "bot", text: headline }]);
    const t1 = setTimeout(() => {
      setBubbles(prev => [...prev, { from: "bot", text: questions[0]?.label ?? "" }]);
      setTimeout(() => setShowInput(true), 250);
    }, 900);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, showInput]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  async function handleSubmit() {
    if (!value.trim() || sending || !current) return;
    setSending(true);
    const answer = value.trim();
    setBubbles(prev => [...prev, { from: "user", text: answer }]);
    setValue("");
    setShowInput(false);

    const next = step + 1;
    let nextMessage: string | null = null;
    try {
      const res = await fetch(`/api/formularios/${slug}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, key: current.key, value: answer }),
      });
      const data = await res.json();
      if (data.submissionId) setSubmissionId(data.submissionId);
      nextMessage = data.nextMessage ?? null;
    } catch {
      // segue o fluxo mesmo se o registro falhar — não trava o lead numa tela de erro
    }

    if (current.type === "WHATSAPP") trackPixel("Lead");

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
      <header className="bg-gray-950 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/iconefluxvenda.png" alt="FluxVenda" width={26} height={26} />
          <div className="flex items-center gap-2">
            {questions.map((q, i) => (
              <div
                key={q.key}
                className={`rounded-full transition-all ${
                  i === step && !done ? "w-2.5 h-2.5 bg-white" : i < step || done ? "w-2 h-2 bg-blue-500" : "w-2 h-2 border border-gray-600"
                }`}
              />
            ))}
          </div>
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 flex flex-col gap-4">
        {bubbles.map((b, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              b.from === "bot" ? "self-start bg-gray-100 text-gray-900" : "self-end bg-blue-600 text-white"
            }`}
          >
            {b.text}
          </div>
        ))}

        {sending && !showInput && !done && (
          <div className="self-start bg-gray-100 rounded-2xl px-5 py-3.5 flex items-center gap-1 animate-in fade-in duration-300">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}

        {showInput && current && (
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
                placeholder="Digite aqui..."
              />
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || sending}
                className="w-9 h-9 rounded-full bg-gray-950 text-white flex items-center justify-center disabled:opacity-30 flex-shrink-0"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        )}

        {done && (
          <div className="mt-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Check size={16} className="text-white" />
            </div>
            <p className="text-[15px] text-gray-700 leading-relaxed pt-1.5">
              Prontinho! Te chamamos agora no seu WhatsApp com o convite pra testar grátis por 7 dias
              (ou marcar uma demonstração, se preferir). Fica de olho por lá.
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </main>
    </div>
  );
}
