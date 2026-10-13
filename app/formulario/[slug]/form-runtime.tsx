"use client";

import Script from "next/script";
import type { LeadFormUtm } from "@/lib/lead-form-shared";

// Peças comuns às duas páginas públicas de formulário (conversa e quiz em telas).

// Dispara evento pro Meta Pixel, se ele já tiver carregado (formulário sem pixelId não injeta
// o script, então fbq nunca existe — a checagem evita erro nesse caso).
export function trackPixel(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq === "function") {
    const fbq = (window as unknown as { fbq: (...a: unknown[]) => void }).fbq;
    if (params) fbq("track", event, params); else fbq("track", event);
  }
}

// Origem do lead: parâmetros do link (utm_*, ref, src) + de que site veio o clique
export function readUtm(): LeadFormUtm {
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

// 1 visita por sessão do navegador — denominador do funil (visitas → respostas)
export function registerVisit(slug: string, source: string | undefined) {
  try {
    const key = `fv-visita-${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/formularios/${slug}/visita`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    }).catch(() => {});
  } catch { /* sessionStorage indisponível (modo privado) — só não conta a visita */ }
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  return (
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
  );
}
