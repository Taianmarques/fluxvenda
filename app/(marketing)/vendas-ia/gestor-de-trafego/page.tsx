import type { Metadata } from "next";
import { Check, Copy, ExternalLink, MessageCircle, PlayCircle, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BotaoFixoCelular, cartao, Cta, Em, FaixaGarantia, Faq, Kicker, Pagina, reais, Rodape, Topo } from "../_ui";
import { Cases } from "../_ferramentas/Cases";

// Landing do "Gestor de Tráfego com IA": curso em vídeo (estilo área de membros) + ferramentas de
// IA para cada etapa da campanha no Meta Ads. O preço vem da oferta OFERTA_SLUG (cadastrada em
// /admin/ofertas); enquanto ela não existir, mostra o preço padrão e o checkout dá 404.
// Os módulos abaixo são a grade do curso: ajuste aqui quando as aulas forem gravadas.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestor de Tráfego com IA — Vendas IA",
  description: "Aprenda a criar, rodar e otimizar campanhas no Meta Ads com aulas em vídeo e ferramentas de IA que planejam, escrevem e analisam por você.",
  openGraph: {
    title: "Gestor de Tráfego com IA: seus anúncios no Meta Ads sem depender de agência",
    description: "Aulas em vídeo + ferramentas de IA para planejar campanhas, criar anúncios e ler as métricas.",
  },
};

const OFERTA_SLUG = "gestor-trafego-ia";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;
const PRECO_PADRAO_CENTAVOS = 6700;
const CTA = "QUERO SER MEU GESTOR DE TRÁFEGO";

// Grade do curso: cada módulo tem aulas em vídeo e as ferramentas de IA daquela etapa
const MODULOS = [
  {
    titulo: "Tráfego pago sem mistério",
    texto: "Como o Meta Ads decide quem vê o seu anúncio, quanto investir para começar e qual objetivo escolher para o seu negócio.",
    aulas: ["Como o leilão do Meta funciona", "Quanto investir no começo", "Objetivo certo: mensagens, vendas ou cadastros"],
    ferramentas: ["Diagnóstico do negócio para anunciar", "Calculadora de verba inicial"],
  },
  {
    titulo: "Conta pronta para anunciar",
    texto: "Gerenciador de Negócios, conta de anúncios, pagamento, pixel e WhatsApp conectados do jeito certo.",
    aulas: ["Gerenciador de Negócios passo a passo", "Pixel e eventos sem programador", "Conectando o WhatsApp e o Instagram"],
    ferramentas: ["Checklist de configuração da conta"],
  },
  {
    titulo: "Planejamento da campanha",
    texto: "Antes de gastar R$ 1: oferta, público, estrutura de campanha e o que medir.",
    aulas: ["Estrutura campanha, conjunto e anúncio", "Montando o plano de teste", "Definindo a meta de custo por cliente"],
    ferramentas: ["Planejador de campanha", "Plano de teste de 14 dias"],
  },
  {
    titulo: "Públicos que compram",
    texto: "Público aberto, interesses, semelhantes e remarketing: quando usar cada um.",
    aulas: ["Público aberto x segmentado", "Remarketing de quem já interagiu", "Públicos semelhantes de clientes"],
    ferramentas: ["Gerador de públicos e interesses", "Mapa de remarketing"],
  },
  {
    titulo: "Criativos e textos que param o dedo",
    texto: "Ganchos, roteiros de vídeo, imagens e textos de anúncio feitos com IA para o seu público.",
    aulas: ["O que faz um anúncio parar o scroll", "Roteiro de vídeo curto para anúncio", "Criando variações para testar"],
    ferramentas: ["Criador de anúncios para Meta Ads", "Roteirista de vídeo para anúncio", "Banco de ganchos"],
  },
  {
    titulo: "Subindo a campanha na prática",
    texto: "Tela por tela no Gerenciador de Anúncios, do zero até a campanha no ar.",
    aulas: ["Campanha de mensagens no WhatsApp", "Campanha de vendas com pixel", "Erros que fazem o anúncio ser reprovado"],
    ferramentas: ["Revisor de anúncio antes de publicar"],
  },
  {
    titulo: "Lendo as métricas",
    texto: "CPM, CTR, CPC, frequência e custo por conversa: o que cada número diz e o que fazer com ele.",
    aulas: ["As 6 métricas que importam", "Onde está o problema: anúncio, público ou oferta", "Quando esperar e quando mexer"],
    ferramentas: ["Analisador de relatório de campanha", "Diagnóstico de campanha que não vende"],
  },
  {
    titulo: "Otimizar e escalar",
    texto: "Desligar o que não funciona, aumentar a verba do que funciona e renovar criativos antes de cansarem.",
    aulas: ["Rotina semanal de otimização", "Como aumentar a verba sem perder resultado", "Renovação de criativos"],
    ferramentas: ["Plano de otimização semanal", "Planejador de escala"],
  },
];

const SEM_COM: [string, string][] = [
  ["Impulsiona post e torce para dar certo", "Campanha com objetivo, público e meta de custo definidos"],
  ["Paga agência todo mês sem entender o relatório", "Sabe ler cada número e decidir o próximo passo"],
  ["Fica horas tentando escrever um anúncio", "Variações de anúncio prontas em minutos"],
  ["Não sabe se o problema é o anúncio ou a oferta", "Diagnóstico da campanha com IA"],
  ["Desliga a campanha no segundo dia", "Plano de teste com prazo e critério"],
  ["Recebe mensagem e o cliente some", "Roteiro para transformar conversa em venda"],
];

const FRASES = [
  "Já impulsionei post e não veio ninguém.",
  "Paguei agência e não sei para onde foi o dinheiro.",
  "O Gerenciador de Anúncios parece um painel de avião.",
  "Meu concorrente aparece em todo lugar e eu não.",
  "Chegam mensagens, mas ninguém compra.",
  "Tenho medo de queimar dinheiro em anúncio.",
];

// Exemplo da seção de demonstração (números e resposta ilustrativos, avisado na tela)
const METRICAS: [string, string, "ok" | "alerta"][] = [
  ["Investido (7 dias)", "R$ 350,00", "ok"],
  ["CPM", "R$ 18,40", "ok"],
  ["CTR", "0,6%", "alerta"],
  ["Custo por conversa", "R$ 21,90", "alerta"],
  ["Frequência", "3,8", "alerta"],
];
const DIAGNOSTICO = [
  ["O que está acontecendo", "O público já viu o anúncio quase 4 vezes e poucas pessoas clicam (CTR 0,6%). O problema é o criativo cansado, não o público nem a verba."],
  ["O que fazer agora", "Mantenha o conjunto e suba 3 novos criativos com ganchos diferentes: dor, resultado e bastidor. Não aumente a verba até o CTR passar de 1%."],
  ["Quando olhar de novo", "Em 3 dias, comparando o custo por conversa dos novos anúncios com os R$ 21,90 de hoje."],
];

export default async function GestorDeTrafegoLanding() {
  const oferta = await prisma.oferta
    .findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } })
    .catch(() => null);
  const preco = reais(oferta?.itens[0]?.precoCentavos ?? PRECO_PADRAO_CENTAVOS);
  const totalFerramentas = MODULOS.reduce((s, m) => s + m.ferramentas.length, 0);
  const totalAulas = MODULOS.reduce((s, m) => s + m.aulas.length, 0);

  const precoLinha = (
    <p className="text-sm text-[var(--body)]">
      <strong className="text-[var(--text)] text-lg">{preco}</strong> · pagamento único · acesso imediato
    </p>
  );

  return (
    <Pagina>
      <Topo href={CHECKOUT} preco={preco} />

      {/* 1ª dobra */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute right-[-10rem] top-[-14rem] w-[50rem] h-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.14),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-14 md:pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <Kicker>Curso + ferramentas de IA · Meta Ads</Kicker>
            <h1 className="mt-4 font-semibold tracking-[-0.03em] leading-[1.06] text-[2.05rem] md:text-[3.2rem]">
              Seja o gestor de tráfego do seu negócio, <Em>com a IA fazendo o trabalho pesado.</Em>
            </h1>
            <p className="mt-5 text-base md:text-xl text-[var(--body)]">
              Aulas em vídeo que mostram tela por tela como criar, rodar e otimizar campanhas no Facebook e no Instagram. E ferramentas de IA que planejam a campanha, escrevem os anúncios e leem as métricas para você.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-sm">
              {[
                { Icone: PlayCircle, t: `${MODULOS.length} módulos em vídeo` },
                { Icone: Wrench, t: `${totalFerramentas} ferramentas de IA` },
                { Icone: MessageCircle, t: "Campanhas para WhatsApp" },
              ].map(({ Icone, t }) => (
                <li key={t} className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-white/[.03] px-3 py-1.5">
                  <Icone size={15} className="text-[var(--acc)]" />{t}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Cta href={CHECKOUT} texto={CTA} grande />
              {precoLinha}
            </div>
          </div>

          {/* Prévia da área de membros */}
          <div className={`${cartao} p-4 md:p-5`} aria-hidden>
            <div className="aspect-video rounded-xl border border-[var(--line)] bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,.18),transparent_60%),#0d0d10] flex flex-col justify-between p-4">
              <span className="self-start rounded-full bg-black/50 px-2.5 py-1 font-[family-name:var(--f-mono)] text-[10px] tracking-[0.14em] uppercase text-[var(--acc-bright)]">Módulo 7 · Aula 2</span>
              <div className="flex items-center justify-center"><PlayCircle size={56} strokeWidth={1.25} className="text-[var(--acc-bright)]" /></div>
              <p className="font-semibold">Onde está o problema: anúncio, público ou oferta</p>
            </div>
            <ul className="mt-4 space-y-2">
              {MODULOS.slice(4, 8).map((m, i) => (
                <li key={m.titulo} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${i === 2 ? "bg-[var(--acc-dim)] text-[var(--text)]" : "text-[var(--body)]"}`}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="font-[family-name:var(--f-mono)] text-[11px] text-[var(--acc)]">{String(i + 5).padStart(2, "0")}</span>
                    <span className="truncate">{m.titulo}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-[var(--muted)]">{m.aulas.length} aulas · {m.ferramentas.length} ferr.</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Identificação */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Você já <Em>pensou isso?</Em></h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FRASES.map(f => (
              <div key={f} className={`${cartao} p-6`}>
                <p className="text-lg font-semibold leading-snug">“{f}”</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-xl md:text-2xl text-[var(--body)]">
            Anúncio não é sorte. <strong className="text-[var(--text)]">É método, teste e leitura de números.</strong>
          </p>
        </div>
      </section>

      {/* Sem × com */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">Anunciar <Em>no escuro</Em> e anunciar com método.</h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">Sem o Gestor de Tráfego com IA</p>
              <ul className="mt-5 space-y-4">
                {SEM_COM.map(([sem]) => (
                  <li key={sem} className="flex gap-3 text-[var(--body)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center flex-shrink-0"><X size={12} strokeWidth={3} /></span>{sem}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${cartao} p-6 border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Com o Gestor de Tráfego com IA</p>
              <ul className="mt-5 space-y-4">
                {SEM_COM.map(([, com]) => (
                  <li key={com} className="flex gap-3 text-[var(--text)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--acc)] text-[var(--on-acc)] flex items-center justify-center flex-shrink-0"><Check size={12} strokeWidth={3} /></span>{com}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona: aula + ferramenta */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Como funciona</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Você assiste, <Em>a IA executa com você.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Cada módulo junta a aula que explica com a ferramenta que faz.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { passo: "Assista à aula", texto: "Vídeos curtos e diretos, gravando a tela do Gerenciador de Anúncios. Você vê exatamente onde clicar." },
              { passo: "Use a ferramenta", texto: "Responda perguntas simples sobre o seu negócio. A ferramenta monta o comando completo com as suas informações." },
              { passo: "Copie e cole na IA", texto: "Cole no ChatGPT ou no Claude e receba o plano, o anúncio ou o diagnóstico pronto para aplicar." },
            ].map((p, i) => (
              <div key={p.passo} className={`${cartao} p-6`}>
                <Kicker>Passo {i + 1}</Kicker>
                <h3 className="mt-3 text-2xl font-semibold">{p.passo}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{p.texto}</p>
                {i === 2 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--acc)] text-[var(--on-acc)] px-3 py-1 text-xs font-semibold"><Copy size={12} /> Copiar</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs"><ExternalLink size={12} /> ChatGPT</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs"><ExternalLink size={12} /> Claude</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[var(--muted)] max-w-2xl mx-auto">
            As ferramentas não acessam a sua conta de anúncios e não mexem nas suas campanhas. Você cola os números do relatório, a IA analisa e você decide o que aplicar.
          </p>
        </div>
      </section>

      {/* Demonstração: leitura de métricas */}
      <section id="demonstracao" className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Veja na prática</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Cole os números. <Em>Receba o diagnóstico.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Exemplo da ferramenta “Diagnóstico de campanha que não vende” para uma clínica de estética.</p>
          </div>
          <div className="mt-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
            <div className={`${cartao} p-6`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">Relatório da campanha</p>
              <dl className="mt-5 divide-y divide-[var(--line)]">
                {METRICAS.map(([nome, valor, estado]) => (
                  <div key={nome} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[var(--body)]">{nome}</dt>
                    <dd className="flex items-center gap-2 font-[family-name:var(--f-mono)] tabular-nums">
                      {valor}
                      {estado === "alerta" && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300">atenção</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={`${cartao} p-6 border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]`}>
              <p className="flex items-center gap-2 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]"><Sparkles size={14} /> Diagnóstico da IA</p>
              <div className="mt-5 space-y-5">
                {DIAGNOSTICO.map(([t, d]) => (
                  <div key={t}>
                    <h3 className="font-semibold">{t}</h3>
                    <p className="mt-1 text-[var(--body)] leading-relaxed">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--muted)]">Números e resposta ilustrativos. A resposta real depende dos dados que você colar.</p>
        </div>
      </section>

      {/* Grade do curso */}
      <section id="conteudo" className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>{MODULOS.length} módulos · {totalAulas} aulas · {totalFerramentas} ferramentas</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Do primeiro anúncio <Em>à campanha que escala.</Em></h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {MODULOS.map((m, i) => (
              <div key={m.titulo} className={`${cartao} p-6 md:p-7`}>
                <Kicker>Módulo {i + 1}</Kicker>
                <h3 className="mt-3 text-2xl font-semibold">{m.titulo}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{m.texto}</p>
                <div className="mt-4 pt-4 border-t border-[var(--line)] grid sm:grid-cols-2 gap-4 text-sm">
                  <ul className="space-y-1.5 text-[var(--body)]">
                    {m.aulas.map(a => <li key={a} className="flex gap-2"><PlayCircle size={15} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{a}</li>)}
                  </ul>
                  <ul className="space-y-1.5 text-[var(--body)]">
                    {m.ferramentas.map(f => <li key={f} className="flex gap-2"><Wrench size={15} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{f}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Cases />

      {/* A oferta */}
      <section id="oferta" className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-2xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Tudo o que você <Em>recebe.</Em></h2>
          <div className={`${cartao} mt-10 p-7 md:p-10 border-[rgba(251,191,36,.3)] text-left`}>
            <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Gestor de Tráfego com IA</p>
            <ul className="mt-3 space-y-2.5 text-[var(--body)]">
              {[
                `${MODULOS.length} módulos com ${totalAulas} aulas em vídeo`,
                `${totalFerramentas} ferramentas de IA para cada etapa da campanha`,
                "Passo a passo de campanhas para WhatsApp e para vendas",
                "Rotina semanal de otimização",
                "Acesso pelo celular ou computador, no seu ritmo",
              ].map(t => <li key={t} className="flex gap-2.5"><Check size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
            <div className="mt-8 pt-8 border-t border-[var(--line)]">
              <p className="font-semibold">A conta</p>
              <p className="mt-2 text-[var(--body)] leading-relaxed">
                Um gestor de tráfego costuma cobrar uma mensalidade para cuidar das campanhas, além da verba dos anúncios. Aqui você paga uma vez e aprende a cuidar das suas, com a IA ajudando em cada etapa.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-[var(--line)] text-center">
              <p className="text-6xl md:text-7xl font-semibold tracking-[-0.04em] tabular-nums">{preco}</p>
              <p className="mt-2 text-[var(--body)]">Pagamento único. Sem mensalidade. Acesso imediato.</p>
              <p className="mt-4 text-sm text-[var(--muted)]">A verba dos anúncios é paga direto ao Meta e não está incluída. Acesso liberado após a confirmação do pagamento.</p>
              <div className="mt-8 flex justify-center"><Cta href={CHECKOUT} texto={CTA} grande /></div>
              <p className="mt-4 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">Pix ou cartão · Compra segura</p>
            </div>
          </div>
        </div>
      </section>

      {/* Garantia */}
      <section className="border-t border-[var(--line)]">
        <FaixaGarantia />
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">7 dias para <Em>testar tudo.</Em></h2>
          <p className="mt-5 text-lg text-[var(--body)] leading-relaxed">
            Assista às aulas e use as ferramentas. Se não gostar, peça o reembolso em até 7 dias e devolvemos 100% do valor, sem perguntas. É o seu direito de arrependimento (art. 49 do Código de Defesa do Consumidor).
          </p>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Perguntas <Em>frequentes.</Em></h2>
          <Faq
            itens={[
              ["Serve para quem nunca anunciou?", "Sim. O curso começa do zero: configuração da conta, primeiro anúncio e leitura das métricas."],
              ["Quanto preciso investir em anúncios?", "Isso é seu e é pago direto ao Meta. No Módulo 1 você calcula uma verba inicial que caiba no seu caixa. O valor do curso não inclui verba de anúncio."],
              ["A IA mexe na minha conta de anúncios?", "Não. As ferramentas não se conectam à sua conta. Você cola as informações e os números do relatório, a IA responde e você decide o que aplicar no Gerenciador."],
              ["Substitui um gestor de tráfego?", "Para muitos pequenos negócios, sim: você passa a planejar, subir e otimizar as próprias campanhas. Contas grandes, com várias campanhas e verba alta, ainda podem precisar de um profissional dedicado."],
              ["Funciona para o meu segmento?", "As ferramentas são personalizadas com as informações do seu negócio. Servem para comércio, serviços, clínicas, lojas e negócios locais que vendem pelo WhatsApp, pelo Instagram ou pelo site."],
              ["Preciso pagar o ChatGPT ou o Claude?", "Não é obrigatório: as ferramentas funcionam nas versões gratuitas. Planos pagos dessas plataformas são cobrados pela OpenAI ou pela Anthropic, não pelo Vendas IA."],
              ["Tem mensalidade?", `Não. É um pagamento único de ${preco}.`],
              ["Como recebo o acesso?", "Assim que o pagamento é confirmado (no cartão, na hora; no Pix, logo após o pagamento), sua conta é criada e você recebe um e-mail para definir a senha e entrar."],
              ["Vocês garantem resultado nas campanhas?", "Não. O resultado depende da oferta, do mercado, da verba e da execução. O que garantimos são os 7 dias para pedir o reembolso integral."],
            ]}
          />
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Pare de impulsionar no escuro. <Em>Comece a anunciar com método.</Em></h2>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Cta href={CHECKOUT} texto={CTA} preco={preco} grande />
            {precoLinha}
          </div>
        </div>
      </section>

      <Rodape avisos={["Meta, Facebook e Instagram são marcas da Meta Platforms, Inc. O Vendas IA não é afiliado à Meta."]} />
      <BotaoFixoCelular href={CHECKOUT} texto={`Quero o Gestor de Tráfego · ${preco}`} />
    </Pagina>
  );
}
