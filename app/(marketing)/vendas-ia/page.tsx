import type { Metadata } from "next";
import Link from "next/link";
import { Check, Copy, ExternalLink, ShieldCheck, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CentralIcone } from "@/lib/central-icons";
import { BotaoFixoCelular, cartao, Cta, Em, FaixaGarantia, Kicker, Pagina, reais, Rodape, Topo } from "./_ui";

// Landing de vendas do Vendas IA (100 prompts). Carta de vendas longa, tema escuro com destaque
// âmbar. Preço, módulos e quantidade de prompts vêm do banco — mudou no admin, mudou aqui.
// Todos os botões levam ao checkout /comprar/vendas-ia.

export const dynamic = "force-dynamic";

const OFERTA_SLUG = "vendas-ia";
const PRODUTO_SLUG = "100-prompts-vendas";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;

export const metadata: Metadata = {
  title: "Vendas IA — 100 prompts para vender mais com o ChatGPT e o Claude",
  description: "100 prompts inteligentes e personalizados para transformar o ChatGPT ou o Claude no seu assistente de vendas. Pagamento único, acesso imediato e 7 dias de garantia.",
  openGraph: {
    title: "Vendas IA — o ChatGPT e o Claude trabalhando nas suas vendas",
    description: "Escolha o que deseja fazer, responda algumas perguntas e receba um comando profissional pronto para usar na sua IA favorita.",
  },
};

export default async function VendasIaLanding() {
  const [oferta, produto] = await Promise.all([
    prisma.oferta.findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } }),
    prisma.infoProduto.findUnique({
      where: { slug: PRODUTO_SLUG },
      include: {
        modulos: {
          orderBy: { numero: "asc" },
          include: { ferramentas: { where: { publicada: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { nome: true } } },
        },
      },
    }),
  ]);

  const precoCentavos = oferta?.itens[0]?.precoCentavos ?? produto?.precoReferenciaCentavos ?? 4700;
  const preco = reais(precoCentavos);
  const modulos = (produto?.modulos ?? []).filter(m => m.ferramentas.length > 0);
  const totalPrompts = modulos.reduce((s, m) => s + m.ferramentas.length, 0) || 100;
  const porPrompt = reais(Math.round(precoCentavos / totalPrompts));

  return (
    <Pagina>

      <Topo href={CHECKOUT} preco={preco} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-12rem] -translate-x-1/2 w-[56rem] h-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.16),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-14 text-center">
          <p className="text-[var(--muted)] text-base md:text-lg">Quantas vezes você pediu pro ChatGPT “escrever uma mensagem de venda” e recebeu um texto que ninguém responderia?</p>
          <h1 className="mt-6 text-[2.35rem] leading-[1.06] md:text-[4rem] font-semibold tracking-[-0.03em]">
            {totalPrompts} prompts que transformam o ChatGPT ou o Claude no <Em>seu assistente de vendas.</Em>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[var(--body)] max-w-2xl mx-auto">
            Escolha o que deseja fazer, responda algumas perguntas e receba um comando profissional pronto para usar na sua IA favorita — com os dados do <strong className="text-[var(--text)] font-semibold">seu</strong> negócio.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Cta href={CHECKOUT} texto="Quero meus prompts" preco={preco} grande />
            <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">Pagamento único · Acesso imediato · 7 dias de garantia</p>
          </div>

          <ol className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            {["Atrair clientes", "Responder no WhatsApp", "Quebrar objeções", "Fechar e vender de novo"].map((t, i) => (
              <li key={t} className={`${cartao} px-4 py-3.5 flex items-center gap-3`}>
                <span className="font-[family-name:var(--f-mono)] text-xs text-[var(--acc)]">0{i + 1}</span>
                <span className="text-sm font-medium">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Demonstração do produto */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
        <div className={`${cartao} p-3 md:p-4`}>
          <div className="rounded-xl bg-[#0d0d11] border border-[var(--line)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)]">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" /><span className="w-2.5 h-2.5 rounded-full bg-white/15" /><span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="ml-3 font-[family-name:var(--f-mono)] text-[11px] text-[var(--muted)]">Negociação e objeções · Resposta para “tá caro”</span>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="p-5 md:p-6 space-y-4 md:border-r border-[var(--line)]">
                <Kicker>1 · Você responde</Kicker>
                {[
                  ["O que você vende", "Planejados sob medida para cozinha"],
                  ["Preço do orçamento", "R$ 18.400"],
                  ["O que o cliente disse", "“Achei caro, vi mais barato em outra loja”"],
                  ["Seu diferencial", "Projeto 3D grátis, MDF 18mm, montagem própria"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-[var(--muted)] mb-1">{l}</p>
                    <p className="rounded-lg border border-[var(--line)] bg-white/[.03] px-3 py-2 text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <div className="p-5 md:p-6 space-y-4">
                <Kicker>2 · Você recebe o prompt pronto</Kicker>
                <div className="rounded-lg border border-[var(--line)] bg-black/40 p-4 font-[family-name:var(--f-mono)] text-[12px] leading-relaxed text-[var(--body)] h-[13.5rem] overflow-hidden relative">
                  <p>Você é um vendedor consultivo especialista em móveis planejados. Um cliente recebeu um orçamento de <span className="text-[var(--acc-bright)]">R$ 18.400</span> para <span className="text-[var(--acc-bright)]">planejados de cozinha</span> e respondeu: <span className="text-[var(--acc-bright)]">“Achei caro, vi mais barato em outra loja”</span>.</p>
                  <p className="mt-2">Escreva 3 respostas para WhatsApp que NÃO deem desconto de cara, mostrem o valor de <span className="text-[var(--acc-bright)]">projeto 3D grátis, MDF 18mm e montagem própria</span>, façam uma pergunta para entender a comparação e terminem com um próximo passo claro…</p>
                  <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d0d11] to-transparent" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--acc)] text-[var(--on-acc)] px-3.5 py-1.5 text-xs font-semibold"><Copy size={13} /> Copiar prompt</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-xs"><ExternalLink size={13} /> Abrir no ChatGPT</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-xs"><ExternalLink size={13} /> Abrir no Claude</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">Exemplo ilustrativo de uma das ferramentas.</p>
      </section>

      {/* Dores */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Você reconhece alguma <Em>dessas?</Em></h2>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              ["O “faça um anúncio” que volta genérico", "Você pede pra IA, ela devolve um texto bonito que serviria pra qualquer empresa do mundo — menos a sua."],
              ["O cliente que some depois do “tá caro”", "Você não sabe o que responder sem baixar o preço. Responde qualquer coisa. Ele visualiza e não volta."],
              ["O orçamento que nunca teve retorno", "Você mandou, esperou, ficou sem graça de cobrar. A venda esfriou enquanto você pensava no que escrever."],
            ].map(([t, d], i) => (
              <div key={t} className={`${cartao} p-6`}>
                <span className="font-[family-name:var(--f-mono)] text-xs text-[var(--acc)]">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold leading-snug">{t}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-lg text-[var(--body)] max-w-2xl mx-auto">
            O problema nunca foi a IA. É que ela só é tão boa quanto o pedido que você faz — e escrever um bom pedido <strong className="text-[var(--text)]">dá trabalho e exige técnica.</strong>
          </p>
        </div>
      </section>

      {/* Antes x depois */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>A diferença está no comando</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">O mesmo ChatGPT. <Em>Outro resultado.</Em></h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6 opacity-80`}>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-300"><X size={16} /> O que quase todo mundo pede</p>
              <p className="mt-4 rounded-lg border border-[var(--line)] bg-black/30 p-4 font-[family-name:var(--f-mono)] text-sm text-[var(--body)]">faça uma mensagem para cobrar um cliente que não respondeu o orçamento</p>
              <p className="mt-4 text-sm text-[var(--muted)]">Resultado: um “Olá, tudo bem? Gostaria de saber se teve a oportunidade de analisar nossa proposta…” igual ao de todo mundo.</p>
            </div>
            <div className={`${cartao} p-6 border-[rgba(251,191,36,.35)]`}>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--acc-bright)]"><Check size={16} /> O que o Vendas IA monta pra você</p>
              <ul className="mt-4 space-y-2.5 text-sm text-[var(--body)]">
                {[
                  "Quem é o seu cliente e o que ele pediu",
                  "Quanto tempo faz que o orçamento foi enviado",
                  "O tom de voz da sua empresa",
                  "Regras: sem pressão, sem desconto, uma pergunta só",
                  "O formato da resposta: 3 versões curtas para WhatsApp",
                ].map(t => <li key={t} className="flex gap-2.5"><Check size={16} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
              </ul>
              <p className="mt-4 text-sm text-[var(--muted)]">Você só responde as perguntas. A técnica já vem dentro do prompt.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Do problema ao texto pronto, <Em>em três passos.</Em></h2>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              ["Escolha o que precisa", "Anúncio, resposta de objeção, follow-up, oferta, pós-venda… são " + totalPrompts + " situações reais de venda, organizadas por etapa."],
              ["Responda algumas perguntas", "O que você vende, para quem, por quanto. Cadastre sua empresa uma vez e os dados entram sozinhos nos próximos prompts."],
              ["Cole na sua IA", "Copie com um clique e abra direto no ChatGPT ou no Claude. Funciona na versão gratuita e na paga."],
            ].map(([t, d], i) => (
              <div key={t} className={`${cartao} p-6`}>
                <span className="w-10 h-10 rounded-full border border-[var(--acc)] text-[var(--acc)] flex items-center justify-center font-[family-name:var(--f-mono)] text-sm">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center"><Cta href={CHECKOUT} texto="Quero meus prompts" preco={preco} /></div>
        </div>
      </section>

      {/* O que você leva */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>{modulos.length} módulos · {totalPrompts} prompts</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">O que você <Em>leva.</Em></h2>
            <p className="mt-4 text-[var(--body)] text-lg max-w-2xl mx-auto">Da primeira mensagem ao cliente que volta a comprar — cada etapa da venda tem seus prompts.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((m, i) => (
              <div key={m.id} className={`${cartao} p-6 flex flex-col`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="w-11 h-11 rounded-xl bg-[var(--acc-dim)] text-[var(--acc-bright)] flex items-center justify-center"><CentralIcone nome={m.icone} size={20} /></span>
                  <span className="font-[family-name:var(--f-mono)] text-[11px] text-[var(--muted)]">{String(i + 1).padStart(2, "0")} · {m.ferramentas.length} prompts</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{m.nome}</h3>
                {m.descricao && <p className="mt-1 text-sm text-[var(--body)]">{m.descricao}</p>}
                <ul className="mt-4 pt-4 border-t border-[var(--line)] space-y-1.5 text-sm text-[var(--muted)]">
                  {m.ferramentas.slice(0, 3).map(f => <li key={f.nome} className="flex gap-2"><Check size={14} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{f.nome}</li>)}
                  {m.ferramentas.length > 3 && <li className="pl-[22px]">e mais {m.ferramentas.length - 3}…</li>}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              ["Perfil da empresa", "Cadastre uma vez: nome, produtos, público, diferenciais. Os prompts já saem preenchidos."],
              ["Favoritos e histórico", "Guarde os prompts que funcionaram e reutilize com um clique."],
              ["Instruções de uso", "Cada prompt diz o que você recebe e o que pedir em seguida para melhorar."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-dashed border-[var(--line-strong)] p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-[var(--body)]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28 grid md:grid-cols-2 gap-4">
          <div className={`${cartao} p-7`}>
            <h2 className="text-2xl font-semibold">É pra você <Em>se…</Em></h2>
            <ul className="mt-5 space-y-3 text-[var(--body)]">
              {[
                "Você tem um pequeno negócio e é você quem vende (ou quase sempre)",
                "Vende pelo WhatsApp, Instagram ou indicação",
                "Já usa o ChatGPT ou o Claude, mas o resultado sai genérico",
                "Não tem dinheiro (nem tempo) para agência ou consultor",
              ].map(t => <li key={t} className="flex gap-3"><Check size={18} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
          </div>
          <div className={`${cartao} p-7`}>
            <h2 className="text-2xl font-semibold">Não é pra você <Em>se…</Em></h2>
            <ul className="mt-5 space-y-3 text-[var(--body)]">
              {[
                "Procura um robô que vende sozinho, sem você fazer nada",
                "Não está disposto a copiar, colar e ajustar o texto",
                "Espera resultado sem conversar com o cliente",
              ].map(t => <li key={t} className="flex gap-3"><X size={18} className="text-[var(--muted)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="preco" className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-2xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <Kicker>Tudo isso</Kicker>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">{totalPrompts} prompts, <Em>um pagamento.</Em></h2>
          <div className={`${cartao} mt-10 p-7 md:p-10 border-[rgba(251,191,36,.3)]`}>
            <ul className="space-y-2.5 text-left text-[var(--body)] max-w-sm mx-auto">
              {[`${totalPrompts} prompts em ${modulos.length} módulos`, "Perfil da empresa que preenche os prompts", "Favoritos e histórico", "Use no ChatGPT ou no Claude, grátis ou pago", "Acesso imediato depois do pagamento"].map(t => (
                <li key={t} className="flex gap-2.5"><Check size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-[var(--line)]">
              <p className="text-sm text-[var(--muted)]">Pagamento único, sem mensalidade</p>
              <p className="mt-1 text-6xl md:text-7xl font-semibold tracking-[-0.04em] tabular-nums">{preco}</p>
              <p className="mt-2 text-[var(--body)]">Dá <strong className="text-[var(--text)]">{porPrompt} por prompt</strong> — menos do que o tempo que você perde escrevendo uma única mensagem do zero.</p>
            </div>
            <div className="mt-8 flex justify-center"><Cta href={CHECKOUT} texto="Quero meus prompts agora" grande /></div>
            <p className="mt-4 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">Pix ou cartão · Compra segura</p>
          </div>
        </div>
      </section>

      {/* Garantia */}
      <section className="border-t border-[var(--line)]">
        <FaixaGarantia />
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Você tem <Em>7 dias.</Em></h2>
          <p className="mt-5 text-lg text-[var(--body)] leading-relaxed">
            Entre, use os prompts nas suas vendas de verdade. Se nos primeiros 7 dias você achar que não valeu, peça o reembolso e devolvemos 100% do valor. Sem pergunta, sem burocracia.
          </p>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Perguntas <Em>frequentes.</Em></h2>
          <div className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {[
              ["Preciso pagar o ChatGPT ou o Claude?", "Não. Os prompts funcionam na versão gratuita das duas. A versão paga costuma dar respostas mais elaboradas, mas não é obrigatória."],
              ["Preciso saber escrever prompt ou entender de IA?", "Não. Você escolhe o que quer fazer e responde perguntas simples sobre o seu negócio. A plataforma monta o comando completo, com a técnica, e você só copia e cola."],
              ["Funciona para o meu tipo de negócio?", "Os prompts se adaptam ao que você vende: loja, prestação de serviço, consultório, indústria, venda para empresas. As respostas que você dá é que personalizam o resultado."],
              ["Tem mensalidade ou custo extra?", `Não. É um pagamento único de ${preco}. Você não paga nada por usar os prompts.`],
              ["Como recebo o acesso?", "Assim que o pagamento é confirmado (no cartão é na hora; no Pix, em instantes), sua conta é criada e você recebe um e-mail para definir sua senha e entrar."],
              ["E se eu não gostar?", "Você tem 7 dias para pedir o reembolso de 100% do valor."],
            ].map(([q, a]) => (
              <div key={q} className="py-6">
                <h3 className="text-lg font-semibold">{q}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fechamento */}
      <section className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-[-14rem] -translate-x-1/2 w-[56rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.14),transparent)]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">
            Você não precisa de mais uma ferramenta. <Em>Precisa saber o que pedir a ela.</Em>
          </h2>
          <p className="mt-6 text-lg text-[var(--body)]">
            Pode continuar escrevendo cada mensagem do zero e torcendo pra IA acertar. Ou pode ter {totalPrompts} comandos prontos, feitos pra vender, por {preco} — uma vez só.
          </p>
          <div className="mt-9 flex justify-center"><Cta href={CHECKOUT} texto="Quero meus prompts" preco={preco} grande /></div>
          <p className="mt-8 text-sm text-[var(--muted)]">
            Ainda não sabe por onde começar? <Link href="/sign-up" className="underline underline-offset-4 hover:text-[var(--text)]">Faça o diagnóstico comercial gratuito</Link> e veja quais áreas travam suas vendas.
          </p>
        </div>
      </section>

      <Rodape />

      <BotaoFixoCelular href={CHECKOUT} texto={`Quero meus prompts · ${preco}`} />
    </Pagina>
  );
}
