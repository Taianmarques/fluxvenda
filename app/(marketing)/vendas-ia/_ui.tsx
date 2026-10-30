import Link from "next/link";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ArrowRight } from "lucide-react";

// Peças visuais das landings do Vendas IA: tema escuro, destaque âmbar e itálico serifado nos
// títulos. Pasta com "_" não vira rota.

const ui = Inter_Tight({ subsets: ["latin"], variable: "--f-ui", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });

// Paleta (troque o âmbar pela cor da marca aqui, se quiser)
const PALETA = {
  "--canvas": "#070709",
  "--text": "#edebe6",
  "--body": "rgba(237,235,230,.74)",
  "--muted": "rgba(237,235,230,.52)",
  "--line": "rgba(255,255,255,.08)",
  "--line-strong": "rgba(255,255,255,.15)",
  "--acc": "#fbbf24",
  "--acc-bright": "#fcd34d",
  "--acc-dim": "rgba(251,191,36,.13)",
  "--on-acc": "#2b1b02",
} as React.CSSProperties;

export const cartao = "rounded-2xl border border-[var(--line)] bg-[linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.012))] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]";
export const botaoAcc = "bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] text-[var(--on-acc)]";

export function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Raiz da landing: fontes, paleta e animação da faixa de garantia
export function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${ui.variable} ${serif.variable} ${mono.variable} min-h-screen bg-[var(--canvas)] text-[var(--text)] font-[family-name:var(--f-ui)] antialiased pb-24 md:pb-0`}
      style={PALETA}
    >
      <style>{`
        @keyframes vlp-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .vlp-marquee { animation: vlp-marquee 28s linear infinite }
        @media (prefers-reduced-motion: reduce) { .vlp-marquee { animation: none } }
      `}</style>
      {children}
    </div>
  );
}

// Destaque em itálico serifado dentro dos títulos
export function Em({ children }: { children: React.ReactNode }) {
  return <em className="font-[family-name:var(--f-serif)] italic font-normal text-[var(--acc-bright)]">{children}</em>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.18em] uppercase text-[var(--acc)]">{children}</p>;
}

export function Cta({ href, preco, texto, grande = false }: { href: string; preco?: string; texto: string; grande?: boolean }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full ${botaoAcc} font-semibold shadow-[0_10px_40px_-10px_rgba(251,191,36,.6)] transition-transform hover:-translate-y-0.5 text-center ${grande ? "px-8 py-4 text-base md:text-lg" : "px-6 py-3.5 text-base"}`}
    >
      {texto}{preco && <span className="opacity-70">· {preco}</span>}
      <ArrowRight size={grande ? 20 : 18} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function Topo({ href, preco }: { href: string; preco: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(7,7,9,.78)] backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <span className="font-semibold tracking-tight text-lg">Vendas <span className="text-[var(--acc)]">IA</span></span>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/sign-in" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">Já comprei · Entrar</Link>
          <Link href={href} className="hidden sm:inline-flex rounded-full border border-[var(--line-strong)] hover:border-[var(--acc)] px-4 py-2 text-sm font-medium">Comprar · {preco}</Link>
        </div>
      </div>
    </header>
  );
}

export function FaixaGarantia() {
  return (
    <div className="overflow-hidden border-b border-[var(--line)] bg-[var(--acc-dim)] py-3" aria-hidden>
      <div className="vlp-marquee flex w-max gap-8 font-[family-name:var(--f-mono)] text-xs tracking-[0.2em] text-[var(--acc-bright)] whitespace-nowrap">
        {Array.from({ length: 16 }).map((_, i) => <span key={i}>7 DIAS PARA DESISTIR • REEMBOLSO INTEGRAL •</span>)}
      </div>
    </div>
  );
}

export function BotaoFixoCelular({ href, texto }: { href: string; texto: string }) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(7,7,9,.92)] backdrop-blur-md p-3">
      <Link href={href} className={`flex items-center justify-center gap-2 rounded-full ${botaoAcc} font-semibold py-3.5 text-sm`}>
        {texto} <ArrowRight size={18} />
      </Link>
    </div>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 text-xs text-[var(--muted)] space-y-2 text-center">
        <p>Vendas IA · FluxVenda</p>
        <p>Direito de arrependimento: reembolso integral em até 7 dias após a compra (art. 49 do Código de Defesa do Consumidor).</p>
        <p>Os resultados dependem do seu negócio, da sua oferta e de como você aplica as ferramentas. Não prometemos aumento de vendas nem faturamento específico.</p>
        <p>ChatGPT e Claude são marcas de seus respectivos donos. O Vendas IA não é afiliado à OpenAI nem à Anthropic.</p>
      </div>
    </footer>
  );
}
