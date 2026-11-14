import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Briefcase, Check, ChevronDown, Megaphone, MessageSquareText, Play, Plug,
  Plus, ShieldCheck, SlidersHorizontal, Sparkles, Target, UserRound, X,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fontesGestor } from "@/app/fontes-gestor";
import { ChatAgente } from "./ChatAgente";
import { MotionGerenciador } from "./MotionGerenciador";

// Landing "Gestor com IA" (3ª página do Gestor de Tráfego com IA): direção de arte própria — preto,
// branco e dourado, Manrope/Inter/IBM Plex Mono, sem serifa nem itálico. Mesmo produto das landings
// /vendas-ia/gestor-de-trafego e /vendas-ia/anuncios-com-ia, mas com oferta própria (R$ 97).
// Sem contagem regressiva nem preço "de": a oferta é o preço real.
//
// VÍDEOS: cole aqui o link de cada gravação real (YouTube, Vimeo ou arquivo .mp4). Enquanto estiver
// vazio, o espaço aparece com a moldura "vídeo em gravação".
const VIDEOS = {
  hero: "",
  demonstracao: "",
  criacao: "",
  analise: "",
  desperdicio: "",
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestor com IA — seu próximo gestor de tráfego pode ser uma IA",
  description: "Crie campanhas no Facebook e Instagram, analise resultados e descubra onde seus anúncios estão desperdiçando dinheiro conversando com o ChatGPT ou o Claude.",
  openGraph: {
    title: "Seu próximo gestor de tráfego pode ser uma IA",
    description: "Meta Ads + ChatGPT + Claude: crie campanhas, analise resultados e identifique desperdícios conversando com a IA.",
  },
};

const OFERTA_SLUG = "gestor-com-ia";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;
const PRECO_PADRAO_CENTAVOS = 9700;

// Paleta da página (exposta como variáveis para os componentes filhos)
const PALETA = {
  "--bg": "#08090B",
  "--card": "#151619",
  "--txt": "#FFFFFF",
  "--sec": "#D4D4D8",
  "--gold": "#FFBF24",
  "--gold-2": "#FFE6A0",
  "--line": "#2A2A2E",
} as React.CSSProperties;

// fonteTitulo = só a fonte (cards e rótulos); titulo = fonte + caixa alta dos títulos de seção
const fonteTitulo = "font-[family-name:var(--g-titulo)] font-extrabold";
const titulo = `${fonteTitulo} uppercase tracking-[-0.03em]`;
const mono = "font-[family-name:var(--g-mono)]";
const card = "rounded-2xl border border-[var(--line)] bg-[var(--card)]";

// R$ 97 (sem centavos quando é valor redondo)
function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: centavos % 100 ? 2 : 0 });
}

// ── Peças visuais ────────────────────────────────────────────────────────────────────────────

function Etiqueta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`${mono} text-[11px] sm:text-xs font-medium tracking-[0.18em] uppercase text-[var(--gold)] ${className}`}>{children}</p>;
}

function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`${titulo} gx-in text-[1.9rem] leading-[1.02] sm:text-5xl md:text-[3.5rem] ${className}`}>{children}</h2>;
}

function Ouro({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--gold)]">{children}</span>;
}

function Botao({ texto, grande = false, className = "" }: { texto: string; grande?: boolean; className?: string }) {
  return (
    <Link
      href={CHECKOUT}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[var(--gold)] text-[#08090B] ${titulo} tracking-[0.01em] shadow-[0_12px_40px_-14px_rgba(255,191,36,.7)] transition-[transform,background-color] hover:bg-[var(--gold-2)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)] ${grande ? "px-6 sm:px-8 py-5 text-[15px] sm:text-lg" : "px-6 py-4 text-sm sm:text-base"} ${className}`}
    >
      {texto}
      <ArrowRight size={grande ? 20 : 18} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Secao({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`border-t border-[var(--line)] ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">{children}</div>
    </section>
  );
}

// Espaço para vídeo real: YouTube/Vimeo em iframe (carrega só ao chegar perto), .mp4 em <video>.
// Sem link, mostra a moldura com o aviso de que a gravação está sendo preparada.
function Video({ src, titulo: nome, legenda }: { src: string; titulo: string; legenda?: string }) {
  const yt = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const embed = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;

  return (
    <figure className="w-full">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
        {embed ? (
          <iframe src={embed} title={nome} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full" />
        ) : src ? (
          <video src={src} controls preload="none" playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px]">
            <span className="w-16 h-16 rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 flex items-center justify-center"><Play size={22} className="ml-1 text-[var(--gold)]" fill="currentColor" /></span>
            <p className="font-semibold text-[var(--txt)]">{nome}</p>
            <p className={`${mono} text-[10px] uppercase tracking-[0.16em] text-[var(--sec)]/70`}>Vídeo em preparação</p>
          </div>
        )}
      </div>
      {legenda && <figcaption className="mt-3 text-sm text-[var(--sec)]">{legenda}</figcaption>}
    </figure>
  );
}

// ── Conteúdo ─────────────────────────────────────────────────────────────────────────────────

const BENEFICIOS_HERO = ["Crie campanhas", "Analise resultados", "Identifique desperdícios"];

const DUVIDAS = [
  "Quais campanhas realmente estão funcionando?",
  "Estou desperdiçando orçamento?",
  "Quando devo aumentar meu investimento?",
  "Quais anúncios precisam ser otimizados?",
  "O que está fazendo meu custo por resultado aumentar?",
];

const PASSOS = [
  { n: "01", titulo: "Conecte", texto: "Ligue a sua conta do Meta Ads ao ChatGPT ou ao Claude pela integração oficial. A aula mostra tela por tela." },
  { n: "02", titulo: "Peça", texto: "Envie comandos em português, do jeito que você falaria com um gestor: criar, analisar, comparar, sugerir." },
  { n: "03", titulo: "Confirme", texto: "Receba a análise com os números da sua conta e revise as ações disponíveis antes de aplicar qualquer mudança." },
];

const COMPARACAO: { area: string; sem: string; com: string }[] = [
  { area: "Criação", sem: "Dezenas de telas e campos no Gerenciador para subir uma campanha.", com: "Você descreve o que quer e a IA monta a estrutura para você revisar." },
  { area: "Análise", sem: "Colunas, filtros e planilhas para entender o que está acontecendo.", com: "Você pergunta e recebe a explicação com os números da sua conta." },
  { area: "Organização", sem: "Métricas soltas em relatórios diferentes, sem prioridade clara.", com: "Campanhas classificadas e próximos passos em ordem de importância." },
];

const DESPERDICIOS = [
  { nome: "Criativo cansado", texto: "O mesmo público já viu o anúncio várias vezes. O clique cai e o custo sobe sem alarde.", comando: "Liste os anúncios com frequência acima de 3 nos últimos 7 dias e diga quais estão perdendo cliques." },
  { nome: "Campanhas com custos elevados", texto: "Uma campanha cara pode passar despercebida no meio das outras e consumir a sua margem.", comando: "Compare o custo por resultado de cada campanha com a minha meta de R$ 15 e mostre as que estão acima." },
  { nome: "Verba mal distribuída", texto: "A maior parte do orçamento vai para a campanha que menos traz resultado.", comando: "Mostre quanto cada campanha gastou e quantos resultados trouxe. Onde a verba está rendendo menos?" },
  { nome: "Públicos sobrepostos", texto: "Conjuntos diferentes disputam as mesmas pessoas e encarecem o seu próprio anúncio.", comando: "Verifique se meus conjuntos de anúncios estão mirando públicos parecidos e disputando as mesmas pessoas." },
  { nome: "Escala prematura", texto: "Aumentar muito a verba antes da hora costuma fazer o custo por resultado disparar.", comando: "Essa campanha está pronta para aumentar o orçamento? Analise a estabilidade dos últimos 7 dias antes." },
  { nome: "Decisões precipitadas", texto: "Pausar uma campanha no segundo dia joga fora o que o Meta já aprendeu.", comando: "Essa campanha começou há 2 dias. Ela já tem dados suficientes para ser pausada?" },
];

const ENTREGAVEIS = [
  { Icone: Play, titulo: "8 módulos em vídeo", texto: "Do zero à rotina semanal, com aulas curtas gravando a tela." },
  { Icone: MessageSquareText, titulo: "17 comandos prontos", texto: "Para colar no chat e criar, analisar e otimizar campanhas." },
  { Icone: Plug, titulo: "Conexão com o Meta Ads", texto: "Treinamento passo a passo para ligar a conta ao ChatGPT ou ao Claude." },
  { Icone: Megaphone, titulo: "Criação de campanhas", texto: "Aulas práticas de campanhas de mensagens no WhatsApp e de vendas." },
  { Icone: BarChart3, titulo: "Análise de resultados", texto: "O que cada métrica significa e como pedir à IA para ler por você." },
  { Icone: SlidersHorizontal, titulo: "Recomendações de otimização", texto: "Quando cortar, ajustar ou aumentar a verba de cada campanha." },
];

const MODULOS = [
  "Conectando o Meta Ads à IA",
  "Raio-x da sua conta",
  "Criando campanhas pela conversa",
  "Públicos que compram",
  "Criativos e textos",
  "Lendo as métricas com a IA",
  "Otimizar e escalar",
  "Sua rotina de 20 minutos",
];

const PUBLICO = [
  { Icone: Briefcase, titulo: "Empresários que anunciam", texto: "Para entender para onde vai a verba e decidir com base nos números, não no achismo." },
  { Icone: UserRound, titulo: "Quem administra os próprios anúncios", texto: "Para criar e acompanhar campanhas sem se perder no Gerenciador de Anúncios." },
  { Icone: Target, titulo: "Gestores de tráfego", texto: "Para acelerar análises, relatórios e o trabalho operacional de várias contas." },
  { Icone: Sparkles, titulo: "Profissionais de marketing", texto: "Para aplicar IA no dia a dia de mídia paga com um método claro." },
];

const DEMONSTRACOES: { chave: keyof typeof VIDEOS; titulo: string; texto: string }[] = [
  { chave: "criacao", titulo: "Criação de uma campanha", texto: "Do pedido em português à campanha montada para revisão." },
  { chave: "analise", titulo: "Análise de resultados", texto: "A leitura das métricas da conta, explicada em linguagem simples." },
  { chave: "desperdicio", titulo: "Identificação de desperdícios", texto: "Onde a verba está rendendo menos e o que fazer com ela." },
];

// ── Página ───────────────────────────────────────────────────────────────────────────────────

export default async function GestorComIaLanding() {
  const oferta = await prisma.oferta
    .findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } })
    .catch(() => null);
  const preco = brl(oferta?.itens[0]?.precoCentavos ?? PRECO_PADRAO_CENTAVOS);

  const faq: [string, string][] = [
    ["Preciso saber programar?", "Não. Você conecta a conta seguindo a aula, sem código, e depois usa a IA por mensagens em português."],
    ["O que preciso ter no Meta Ads?", "Uma conta de anúncios ativa no Gerenciador de Negócios do Meta, com forma de pagamento cadastrada e acesso de administrador, além da página do Facebook ou do perfil do Instagram que vai anunciar. O primeiro módulo mostra como conferir tudo isso."],
    ["Funciona com o ChatGPT e com o Claude?", "Sim. O treinamento mostra a conexão nas duas plataformas. Os recursos de integração e os planos exigidos são definidos pela OpenAI e pela Anthropic e podem variar; a primeira aula mostra como verificar o que está disponível na sua conta."],
    ["A IA cria campanhas sozinha?", "Ela pode montar e criar campanhas pela conversa quando a integração e as permissões da sua conta permitem isso. Você revisa e confirma antes de qualquer publicação ou alteração. Recomendamos sempre revisar antes de aplicar."],
    ["Tenho custos além do treinamento?", "A verba dos anúncios é paga diretamente ao Meta. Se a sua plataforma de IA exigir um plano pago para usar integrações, ele é cobrado pela OpenAI ou pela Anthropic. Nenhum dos dois está incluído no valor do treinamento."],
    ["E se eu não gostar?", "Você tem 7 dias de garantia. Se não gostar, pede o reembolso e devolvemos 100% do valor (art. 49 do Código de Defesa do Consumidor)."],
    ["Todos os recursos estarão disponíveis na minha conta?", "Os recursos das integrações dependem da Meta, da OpenAI e da Anthropic e podem variar por plano, conta e região, além de mudar com o tempo. As aulas ensinam a verificar o que está ativo para você e a fazer a análise mesmo quando alguma ação precisar ser aplicada manualmente no Gerenciador."],
    ["Como recebo o acesso?", "Assim que o pagamento é confirmado (no cartão, na hora; no Pix, logo após o pagamento), sua conta é criada e você recebe um e-mail para definir a senha e entrar."],
  ];

  const linhaPreco = (
    <p className="text-sm text-[var(--sec)]">
      <strong className="text-[var(--txt)]">{preco}</strong> · Pagamento único · Acesso imediato
    </p>
  );

  return (
    <div className={`${fontesGestor} min-h-screen bg-[var(--bg)] text-[var(--txt)] font-[family-name:var(--g-texto)] antialiased pb-24 md:pb-0`} style={PALETA}>
      <style>{`
        @keyframes gx-up { from { opacity: 0; transform: translateY(14px) } }
        @keyframes gx-msg { from { opacity: 0; transform: translateY(6px) } }
        .gx-msg { animation: gx-msg .45s ease-out both }
        @supports (animation-timeline: view()) {
          .gx-in { animation: gx-up .7s ease-out both; animation-timeline: view(); animation-range: entry 0% entry 35% }
        }
        .gx-faq { interpolate-size: allow-keywords }
        .gx-faq::details-content { block-size: 0; overflow: hidden; transition: block-size .3s ease, content-visibility .3s allow-discrete }
        .gx-faq[open]::details-content { block-size: auto }
        .gx-faq summary::-webkit-details-marker { display: none }
        @media (prefers-reduced-motion: reduce) { .gx-in, .gx-msg { animation: none } .gx-faq::details-content { transition: none } }
      `}</style>

      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(8,9,11,.85)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <span className={`${fonteTitulo} tracking-tight text-lg`}>Vendas <span className="text-[var(--gold)]">IA</span></span>
          <Link href={CHECKOUT} className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[#08090B] hover:bg-[var(--gold-2)] transition-colors">
            Quero meu gestor · {preco}
          </Link>
        </div>
      </header>

      {/* 01 — Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-18rem] -translate-x-1/2 w-[60rem] h-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,191,36,.10),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 md:pb-24 text-center">
          <span className={`inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 bg-[var(--gold)]/[.06] px-4 py-1.5 ${mono} text-[11px] sm:text-xs tracking-[0.18em] text-[var(--gold)]`}>
            META ADS <span className="text-[var(--sec)]/60">+</span> CHATGPT <span className="text-[var(--sec)]/60">+</span> CLAUDE
          </span>
          <h1 className={`${titulo} mt-6 mx-auto max-w-5xl text-[2.35rem] leading-[0.98] sm:text-6xl md:text-7xl lg:text-[5.4rem]`}>
            Seu próximo <Ouro>gestor de tráfego</Ouro> pode ser uma IA.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-base sm:text-xl leading-relaxed text-[var(--sec)]">
            Crie campanhas no Facebook e Instagram, analise resultados e descubra onde seus anúncios podem estar desperdiçando dinheiro. <strong className="font-semibold text-[var(--txt)]">Tudo isso conversando com o ChatGPT ou o Claude.</strong>
          </p>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {BENEFICIOS_HERO.map(b => (
              <li key={b} className={`flex items-center gap-2 ${mono} text-xs sm:text-sm uppercase tracking-[0.12em] text-[var(--txt)]`}>
                <span className="w-5 h-5 rounded-full bg-[var(--gold)] text-[#08090B] flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>{b}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Botao texto="QUERO MEU GESTOR COM IA" grande />
            {linhaPreco}
            <a href="#demonstracao" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--gold)] hover:text-[var(--gold-2)]">Ver a IA funcionando <ChevronDown size={16} /></a>
          </div>
          <div className="mt-14 sm:mt-16 mx-auto max-w-4xl text-left">
            <Video src={VIDEOS.hero} titulo="Veja o Gestor com IA em ação" />
          </div>
        </div>
      </section>

      {/* 02 — Demonstração prática */}
      <Secao id="demonstracao">
        <div className="text-center max-w-4xl mx-auto">
          <Etiqueta>Veja a IA funcionando</Etiqueta>
          <Titulo className="mt-4">Não é só conversar com a IA. <Ouro>É colocá-la para trabalhar.</Ouro></Titulo>
        </div>
        {/* Uma conversa no estilo de cada IA: no Claude a análise, no ChatGPT a aplicação */}
        <div className="mt-14 grid lg:grid-cols-2 gap-6 items-start">
          <figure className="min-w-0">
            <figcaption className={`${mono} mb-3 text-[11px] uppercase tracking-[0.16em] text-[var(--sec)]`}><span className="text-[var(--gold)]">01 ·</span> No Claude: analisar resultados</figcaption>
            <ChatAgente />
          </figure>
          <figure className="min-w-0">
            <figcaption className={`${mono} mb-3 text-[11px] uppercase tracking-[0.16em] text-[var(--sec)]`}><span className="text-[var(--gold)]">02 ·</span> No ChatGPT: criar campanha</figcaption>
            {/* Com gravação real (VIDEOS.demonstracao), ela entra no lugar da animação */}
            {VIDEOS.demonstracao ? <Video src={VIDEOS.demonstracao} titulo="Gravação real do agente" /> : <MotionGerenciador />}
          </figure>
        </div>
        <ul className="mt-10 grid sm:grid-cols-3 gap-4">
          {["Analisa as campanhas direto da sua conta", "Monta campanhas a partir de um pedido em português", "Só publica ou altera depois da sua confirmação"].map(t => (
            <li key={t} className={`${card} flex gap-2.5 p-4 text-[var(--sec)]`}><Check size={17} className="mt-0.5 flex-shrink-0 text-[var(--gold)]" />{t}</li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col items-center gap-3"><Botao texto="QUERO MEU GESTOR COM IA" />{linhaPreco}</div>
      </Secao>

      {/* 03 — Benefícios */}
      <Secao>
        <Titulo className="text-center">Crie. Analise. <Ouro>Otimize.</Ouro></Titulo>
        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {/* 01 Criação */}
          <div className={`${card} gx-in p-6 flex flex-col`}>
            <div className="rounded-xl border border-[var(--line)] bg-black/40 p-4 space-y-2 text-[13px]">
              {[["Objetivo", "Mensagens no WhatsApp"], ["Público", "Mulheres, 30 a 55 anos"], ["Orçamento", "R$ 30 por dia"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 rounded-lg bg-white/[.04] px-3 py-2"><span className="text-[var(--sec)]/70">{k}</span><span className="text-[var(--txt)] text-right">{v}</span></div>
              ))}
            </div>
            <p className={`${mono} mt-6 text-xs text-[var(--gold)]`}>01</p>
            <h3 className={`${fonteTitulo} mt-1 text-xl tracking-[-0.02em]`}>Criação de campanhas</h3>
            <p className="mt-2 text-[var(--sec)] leading-relaxed">Descreva o que você vende e para quem. A IA monta objetivo, público e orçamento para você revisar.</p>
          </div>
          {/* 02 Análise */}
          <div className={`${card} gx-in p-6 flex flex-col`}>
            <div className="rounded-xl border border-[var(--line)] bg-black/40 p-4">
              <p className={`${mono} text-[10px] uppercase tracking-[0.12em] text-[var(--sec)]/70`}>Custo por resultado</p>
              <div className="mt-3 flex items-end gap-3 h-[92px]">
                {[{ h: "88%", v: "R$ 35" }, { h: "45%", v: "R$ 16" }, { h: "26%", v: "R$ 9" }].map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                    <span className={`${mono} text-[10px] text-[var(--sec)]`}>{b.v}</span>
                    <span className={`w-full rounded-t-md ${i === 2 ? "bg-[var(--gold)]" : "bg-white/15"}`} style={{ height: b.h }} />
                  </div>
                ))}
              </div>
            </div>
            <p className={`${mono} mt-6 text-xs text-[var(--gold)]`}>02</p>
            <h3 className={`${fonteTitulo} mt-1 text-xl tracking-[-0.02em]`}>Análise de resultados</h3>
            <p className="mt-2 text-[var(--sec)] leading-relaxed">Pergunte como estão as campanhas e receba a leitura das métricas em português, com os números da sua conta.</p>
          </div>
          {/* 03 Desperdícios */}
          <div className={`${card} gx-in p-6 flex flex-col`}>
            <div className="rounded-xl border border-[var(--line)] bg-black/40 p-4 space-y-2 text-[13px]">
              {[["Promoção de novembro", "Cortar", "bg-[#F87171]"], ["Avaliação gratuita", "Ajustar", "bg-[var(--gold)]"], ["Antes e depois", "Escalar", "bg-[#4ADE80]"]].map(([n, z, cor]) => (
                <div key={n} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.04] px-3 py-2">
                  <span className="truncate text-[var(--txt)]">{n}</span>
                  <span className={`flex items-center gap-1.5 ${mono} text-[10px] uppercase text-[var(--sec)]`}><span className={`w-2 h-2 rounded-full ${cor}`} />{z}</span>
                </div>
              ))}
            </div>
            <p className={`${mono} mt-6 text-xs text-[var(--gold)]`}>03</p>
            <h3 className={`${fonteTitulo} mt-1 text-xl tracking-[-0.02em]`}>Desperdícios e oportunidades</h3>
            <p className="mt-2 text-[var(--sec)] leading-relaxed">Descubra o que está consumindo verba sem retorno e o que merece receber mais investimento.</p>
          </div>
        </div>
      </Secao>

      {/* 04 — Identificação da dor */}
      <Secao>
        <div className="max-w-4xl">
          <Titulo>Seus anúncios consomem dinheiro todos os dias. <Ouro>Mas você sabe onde estão os resultados?</Ouro></Titulo>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {DUVIDAS.map((d, i) => (
            <div key={d} className={`${card} gx-in p-6 ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <p className={`${mono} text-[11px] uppercase tracking-[0.16em] text-[var(--sec)]/70`}>Dúvida {String(i + 1).padStart(2, "0")}</p>
              <p className={`${fonteTitulo} mt-3 text-xl sm:text-2xl leading-snug tracking-[-0.02em]`}>“{d}”</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/[.05] p-6 md:p-8">
          <p className="text-lg sm:text-xl text-[var(--txt)] max-w-xl">A IA responde essas perguntas <strong className="text-[var(--gold)]">com os números da sua própria conta</strong>, em segundos.</p>
          <Botao texto="QUERO MEU GESTOR COM IA" />
        </div>
      </Secao>

      {/* 05 — Como funciona */}
      <Secao>
        <div className="text-center">
          <Etiqueta>Como funciona</Etiqueta>
          <Titulo className="mt-4">Conecte. Peça. <Ouro>Confirme.</Ouro></Titulo>
        </div>
        <ol className="mt-14 grid md:grid-cols-3 gap-4">
          {PASSOS.map(p => (
            <li key={p.n} className={`${card} gx-in p-6 md:p-7`}>
              <span className={`${titulo} block text-5xl text-[var(--gold)]`}>{p.n}</span>
              <h3 className={`${titulo} mt-4 text-2xl`}>{p.titulo}</h3>
              <p className="mt-2 text-[var(--sec)] leading-relaxed">{p.texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 mx-auto max-w-3xl text-center text-sm text-[var(--sec)]/80 leading-relaxed">
          Criar, pausar ou alterar campanhas pela conversa depende dos recursos disponíveis na integração do Meta Ads com cada IA e das permissões que você conceder. Você revisa cada ação antes de ela ser aplicada.
        </p>
      </Secao>

      {/* 06 — Comparação */}
      <Secao>
        <Titulo className="text-center max-w-4xl mx-auto">Brigar com o Gerenciador <Ouro>ou conversar com a IA?</Ouro></Titulo>
        <div className="mt-14 grid md:grid-cols-2 gap-4">
          <div className={`${card} p-6 md:p-8`}>
            <p className={`${mono} text-xs uppercase tracking-[0.18em] text-[var(--sec)]/70`}>Sem IA</p>
            <ul className="mt-6 space-y-6">
              {COMPARACAO.map(c => (
                <li key={c.area} className="flex gap-4">
                  <span className="w-7 h-7 rounded-full border border-[var(--line)] text-[var(--sec)]/70 flex items-center justify-center flex-shrink-0"><X size={14} /></span>
                  <div><p className="font-semibold text-[var(--txt)]">{c.area}</p><p className="mt-1 text-[var(--sec)] leading-relaxed">{c.sem}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--gold)]/45 bg-[linear-gradient(180deg,rgba(255,191,36,.07),rgba(255,191,36,.02))] p-6 md:p-8">
            <p className={`${mono} text-xs uppercase tracking-[0.18em] text-[var(--gold)]`}>Com IA</p>
            <ul className="mt-6 space-y-6">
              {COMPARACAO.map(c => (
                <li key={c.area} className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-[var(--gold)] text-[#08090B] flex items-center justify-center flex-shrink-0"><Check size={14} strokeWidth={3} /></span>
                  <div><p className="font-semibold text-[var(--txt)]">{c.area}</p><p className="mt-1 text-[var(--txt)]/90 leading-relaxed">{c.com}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 mx-auto max-w-3xl text-center text-sm text-[var(--sec)]/80">A IA acelera o trabalho operacional e organiza as informações. As decisões continuam sendo suas, e contas complexas podem seguir precisando de um profissional.</p>
      </Secao>

      {/* 07 — Desperdício financeiro */}
      <Secao>
        <div className="max-w-4xl">
          <Etiqueta>Desperdício financeiro</Etiqueta>
          <Titulo className="mt-4">Sua conta pode estar perdendo dinheiro <Ouro>mesmo quando parece tudo bem.</Ouro></Titulo>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESPERDICIOS.map((d, i) => (
            <div key={d.nome} className={`${card} gx-in p-6 flex flex-col`}>
              <p className={`${mono} text-[11px] uppercase tracking-[0.16em] text-[var(--sec)]/70`}>{String(i + 1).padStart(2, "0")}</p>
              <h3 className={`${fonteTitulo} mt-2 text-xl tracking-[-0.02em]`}>{d.nome}</h3>
              <p className="mt-2 text-[var(--sec)] leading-relaxed flex-1">{d.texto}</p>
              <div className="mt-5 rounded-xl border border-[var(--line)] bg-black/40 p-3.5">
                <p className={`${mono} text-[10px] uppercase tracking-[0.14em] text-[var(--gold)]`}>› Comando</p>
                <p className={`${mono} mt-1.5 text-[12.5px] leading-relaxed text-[var(--txt)]/90`}>{d.comando}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-[var(--sec)]/70">Comandos ilustrativos. No treinamento você recebe 17 comandos prontos, organizados por etapa.</p>
        <div className="mt-10 flex flex-col items-center gap-3"><Botao texto="QUERO MEU GESTOR COM IA" />{linhaPreco}</div>
      </Secao>

      {/* 08 — O que o comprador recebe */}
      <Secao>
        <div className="max-w-4xl">
          <Etiqueta>O que você recebe</Etiqueta>
          <Titulo className="mt-4">Tudo que você precisa para <Ouro>configurar seu gestor com IA.</Ouro></Titulo>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENTREGAVEIS.map(({ Icone, titulo: t, texto }) => (
            <div key={t} className={`${card} gx-in p-6`}>
              <span className="w-10 h-10 rounded-xl border border-[var(--line)] bg-white/[.03] flex items-center justify-center"><Icone size={18} className="text-[var(--gold)]" /></span>
              <h3 className={`${fonteTitulo} mt-5 text-xl tracking-[-0.02em]`}>{t}</h3>
              <p className="mt-2 text-[var(--sec)] leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
        <details className={`gx-faq group mt-4 ${card}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-semibold">
            Ver os 8 módulos
            <span className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center text-[var(--gold)] transition-transform group-open:rotate-45"><Plus size={16} /></span>
          </summary>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-3 px-6 pb-6">
            {MODULOS.map((m, i) => (
              <li key={m} className="flex gap-3 text-[var(--sec)]"><span className={`${mono} text-xs text-[var(--gold)] mt-1`}>{String(i + 1).padStart(2, "0")}</span>{m}</li>
            ))}
          </ol>
        </details>
      </Secao>

      {/* 09 — Para quem é */}
      <Secao>
        <div className="text-center">
          <Etiqueta>Para quem é</Etiqueta>
          <Titulo className="mt-4">Feito para quem <Ouro>anuncia no Meta.</Ouro></Titulo>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PUBLICO.map(({ Icone, titulo: t, texto }) => (
            <div key={t} className={`${card} gx-in p-6`}>
              <Icone size={22} className="text-[var(--gold)]" />
              <h3 className={`${fonteTitulo} mt-5 text-lg leading-snug tracking-[-0.02em]`}>{t}</h3>
              <p className="mt-2 text-[var(--sec)] leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* 10 — Prova prática */}
      <Secao>
        <div className="text-center">
          <Etiqueta>Prova prática</Etiqueta>
          <Titulo className="mt-4">Veja o que o agente <Ouro>consegue fazer.</Ouro></Titulo>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {DEMONSTRACOES.map(d => (
            <div key={d.chave} className="gx-in">
              <Video src={VIDEOS[d.chave]} titulo={d.titulo} />
              <h3 className={`${fonteTitulo} mt-4 text-lg tracking-[-0.02em]`}>{d.titulo}</h3>
              <p className="mt-1 text-[var(--sec)]">{d.texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* 11 — Oferta */}
      <section id="oferta" className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-[-16rem] -translate-x-1/2 w-[64rem] h-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,191,36,.12),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <Etiqueta>Oferta</Etiqueta>
            <Titulo className="mt-4">Seu gestor de tráfego <Ouro>com IA.</Ouro></Titulo>
            <p className="mt-5 text-lg text-[var(--sec)] leading-relaxed">Aprenda a configurar um agente conectado ao Meta Ads para ajudar você a criar campanhas, analisar resultados e tomar decisões mais informadas.</p>
          </div>
          <div className="mt-14 grid lg:grid-cols-[1fr_1.1fr] rounded-3xl border border-[var(--gold)]/40 bg-[var(--card)] overflow-hidden shadow-[0_40px_120px_-40px_rgba(255,191,36,.35)]">
            <div className="p-7 sm:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[var(--line)]">
              <p className={`${mono} text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]`}>Gestor com IA · acesso completo</p>
              <p className={`${titulo} mt-6 text-[4.5rem] sm:text-[6rem] leading-none tracking-[-0.05em] text-[var(--gold)] tabular-nums`}>{preco}</p>
              <p className="mt-3 text-lg text-[var(--txt)]">Pagamento único</p>
              <p className="mt-1 text-[var(--sec)]">Sem mensalidade do Vendas IA. Pix ou cartão.</p>
              <Botao texto="QUERO MEU GESTOR COM IA" grande className="mt-8 w-full" />
              <ul className={`mt-6 flex flex-wrap gap-x-5 gap-y-2 ${mono} text-[11px] uppercase tracking-[0.12em] text-[var(--sec)]`}>
                <li className="flex items-center gap-1.5"><Check size={13} className="text-[var(--gold)]" /> Acesso imediato</li>
                <li className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-[var(--gold)]" /> Garantia de 7 dias</li>
              </ul>
            </div>
            <div className="p-7 sm:p-10">
              <p className={`${fonteTitulo} text-xl tracking-[-0.02em]`}>O que está incluído</p>
              <ul className="mt-6 space-y-4">
                {[
                  "8 módulos em vídeo, do zero à rotina semanal",
                  "17 comandos prontos para criar, analisar e otimizar",
                  "Treinamento de conexão do Meta Ads com o ChatGPT e o Claude",
                  "Aulas práticas de criação de campanhas",
                  "Análise de resultados em linguagem simples",
                  "Recomendações de otimização: cortar, ajustar ou escalar",
                ].map(t => (
                  <li key={t} className="flex gap-3 text-[var(--txt)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--gold)] text-[#08090B] flex items-center justify-center flex-shrink-0"><Check size={12} strokeWidth={3} /></span>{t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3 rounded-xl border border-[var(--line)] bg-black/30 p-4">
                <ShieldCheck size={22} className="flex-shrink-0 text-[var(--gold)]" />
                <p className="text-sm text-[var(--sec)] leading-relaxed"><strong className="text-[var(--txt)]">Garantia de 7 dias.</strong> Assista, conecte e teste. Se não gostar, devolvemos 100% do valor.</p>
              </div>
              <p className="mt-4 text-xs text-[var(--sec)]/70">A verba dos anúncios e eventuais planos do ChatGPT ou do Claude não estão incluídos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12 — FAQ */}
      <Secao>
        <div className="max-w-3xl mx-auto">
          <Titulo className="text-center">Perguntas <Ouro>frequentes.</Ouro></Titulo>
          <div className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faq.map(([q, r]) => (
              <details key={q} name="faq" className="gx-faq group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-semibold hover:text-[var(--gold)] transition-colors">
                  {q}
                  <span className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center flex-shrink-0 text-[var(--gold)] transition-transform duration-300 group-open:rotate-45 group-open:border-[var(--gold)]"><Plus size={16} /></span>
                </summary>
                <p className="pb-6 pr-12 text-[var(--sec)] leading-relaxed">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </Secao>

      {/* 13 — CTA final */}
      <Secao>
        <div className="text-center max-w-4xl mx-auto">
          <Titulo>Agora é sua vez de <Ouro>colocar a IA para trabalhar</Ouro> nos seus anúncios.</Titulo>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Botao texto="QUERO CONFIGURAR MEU GESTOR COM IA" grande />
            {linhaPreco}
          </div>
        </div>
      </Secao>

      {/* Rodapé */}
      <footer className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-2 text-center text-xs text-[var(--sec)]/60">
          <p>Vendas IA · FluxVenda</p>
          <p>Direito de arrependimento: reembolso integral em até 7 dias após a compra (art. 49 do Código de Defesa do Consumidor).</p>
          <p>Os resultados dependem do seu negócio, da sua oferta, da verba e de como você aplica o método. Não prometemos aumento de vendas nem resultado específico.</p>
          <p>Meta, Facebook e Instagram são marcas da Meta Platforms, Inc. ChatGPT e Claude são marcas da OpenAI e da Anthropic. O Vendas IA não é afiliado a essas empresas, e os recursos de integração são oferecidos por elas.</p>
        </div>
      </footer>

      {/* Barra fixa no celular */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(8,9,11,.94)] backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0 leading-tight">
          <p className={`${fonteTitulo} text-lg text-[var(--txt)] tracking-tight`}>{preco}</p>
          <p className={`${mono} text-[10px] uppercase tracking-[0.1em] text-[var(--sec)]/70`}>Pagamento único</p>
        </div>
        <Link href={CHECKOUT} className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--gold)] py-3.5 text-[#08090B] ${titulo} text-sm tracking-[0.01em]`}>
          QUERO MEU GESTOR <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
