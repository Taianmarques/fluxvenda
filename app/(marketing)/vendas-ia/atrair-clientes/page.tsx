import type { Metadata } from "next";
import { ArrowRight, Check, Clock, Copy, ExternalLink, Gift, ShieldCheck, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BotaoFixoCelular, cartao, Cta, Em, FaixaGarantia, Faq, Kicker, Pagina, reais, Rodape, Topo } from "../_ui";
import { MotionPlataforma } from "../_ferramentas/MotionPlataforma";
import { DemoAbas } from "../_ferramentas/DemoAbas";
import { ContagemHoje } from "../_ferramentas/ContagemHoje";
import { Cases } from "../_ferramentas/Cases";
import { carregarDemoAnuncio, DEMO_NOME, DEMO_RESPOSTA } from "../_ferramentas/demo";

// Landing "Atrair clientes": mesma oferta de R$ 67 das landings de 100 ferramentas, com o ângulo de
// atração. As ferramentas são as mesmas; a página só agrupa os módulos em etapas:
//   Sistema de Atração (principal) = módulos 1 a 4 · bônus Converter = 5 a 8 · bônus Crescer = 9 e 10.
// As contagens vêm do banco. O preço "de" e a contagem até 23h59 são da campanha (não vêm da oferta).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendas IA — Atraia mais clientes com IA",
  description: "Ferramentas de atração que mostram quem é o seu cliente, criam a sua oferta, escrevem os seus anúncios e montam o seu conteúdo. Para usar no ChatGPT ou no Claude.",
  openGraph: {
    title: "Atraia mais clientes com IA: anúncios, ofertas e conteúdo prontos para o seu negócio",
    description: "Ferramentas de atração personalizadas para o seu negócio, prontas para usar no ChatGPT ou no Claude.",
  },
};

const OFERTA_SLUG = "vendas-ia-ferramentas";
const PRODUTO_SLUG = "100-prompts-vendas";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;
const PRECO_DE_CENTAVOS = 19700;
const CTA = "QUERO ATRAIR MAIS CLIENTES";

// Os 4 passos do Sistema de Atração (módulo do banco pelo número)
const PASSOS = [
  { modulo: 1, curto: "Descubra quem compra", titulo: "Descubra quem compra", texto: "Identifique o seu cliente ideal, as dores que ele tem e as palavras que ele usa.", exemplos: ["Identifique seu cliente ideal", "Descubra as principais dores do público", "Encontre oportunidades que você não está aproveitando"] },
  { modulo: 2, curto: "Crie a oferta", titulo: "Crie o motivo para comprar", texto: "Transforme o seu produto numa oferta que faz o cliente parar de comparar preço.", exemplos: ["Transforme um produto comum em oferta", "Crie argumentos de valor", "Apresentação comercial"] },
  { modulo: 3, curto: "Anuncie", titulo: "Anuncie para quem importa", texto: "Anúncios e campanhas com a dor, o desejo e a oferta certa.", exemplos: ["Crie anúncios para Meta Ads", "Planeje campanha de geração de contatos", "Variações para teste"] },
  { modulo: 4, curto: "Apareça todo dia", titulo: "Apareça todo dia", texto: "Conteúdo para Instagram e WhatsApp que atrai e puxa conversa.", exemplos: ["Calendário de 30 dias", "Roteiros de Reels", "Mensagens para lista de transmissão"] },
];
const CONVERTER = [5, 6, 7, 8];
const CRESCER = [9, 10];

// Cards da animação do topo (um por passo); o de anúncios é a ferramenta de exemplo
const VITRINE = [
  { slug: "identifique-seu-cliente-ideal", rotulo: "Descobrir quem compra" },
  { slug: "transforme-um-produto-comum-em-uma-oferta", rotulo: "Criar a oferta" },
  { slug: "crie-anuncios-para-meta-ads", rotulo: "Anunciar" },
  { slug: "crie-calendario-editorial-de-30-dias", rotulo: "Aparecer todo dia" },
];

const SEM_COM: [string, string][] = [
  ["Anuncia para “todo mundo” e não convence ninguém", "Sabe exatamente quem é o seu cliente e o que ele quer ouvir"],
  ["O cliente compara só o preço", "Uma oferta que muda o critério de comparação"],
  ["Fica horas tentando escrever um anúncio", "3 versões de anúncio prontas em minutos"],
  ["Paga agência ou depende de indicação", "Faz sozinho, com método"],
  ["Abre o Instagram e não sabe o que postar", "30 dias de conteúdo prontos numa tarde"],
  ["Posta e ninguém chama no WhatsApp", "Conteúdo com chamada para a conversa"],
];

const FRASES = [
  "Meus clientes vêm só por indicação e eu não controlo quando chegam.",
  "Já impulsionei post e não veio ninguém.",
  "Não sei o que escrever no anúncio.",
  "Meu concorrente aparece em todo lugar e eu não.",
  "Não tenho tempo para criar conteúdo todo dia.",
  "Não tenho dinheiro para pagar agência.",
];

const PLANO_ATRAIR: [string, string][] = [
  ["Cadastrar o negócio e descobrir o cliente ideal", "Perfil do cliente"],
  ["Mapear as dores e os desejos do público", "Lista de dores"],
  ["Transformar o seu produto numa oferta", "Oferta escrita"],
  ["Criar 3 anúncios para testar", "Anúncios prontos"],
  ["Montar o calendário de 30 dias", "Calendário pronto"],
  ["Criar mensagens para a lista de transmissão", "Mensagens prontas"],
  ["Preparar as respostas para quem chegar (Bônus Converter)", "Roteiro de atendimento"],
];

// Exemplos da seção "Veja na prática" (respostas ilustrativas; a animação deixa isso escrito)
const ABAS_DEMO = [
  {
    rotulo: "Criar um anúncio",
    sem: {
      titulo: "Pedido genérico",
      pedido: "Crie um anúncio para minha clínica",
      resposta: "Cuide da sua saúde com quem entende! Nossa clínica oferece atendimento de qualidade, profissionais experientes e um ambiente acolhedor. Agende já a sua consulta!",
      itens: ["Serviria para qualquer clínica", "Não fala de nenhuma dor real", "Sem motivo para chamar agora"],
    },
    com: {
      titulo: "Com a Vendas IA",
      pedido: "Prompt do “Criador de Anúncios” · fisioterapia · mulheres de 35 a 60 anos · dor nas costas que atrapalha o trabalho · avaliação com plano de tratamento · objetivo: mensagens no WhatsApp",
      resposta: "1 · Dor — Gancho: Trabalha o dia todo com dor nas costas? Oferta: avaliação com plano de tratamento. Chamada: chame no WhatsApp.\n2 · Desejo — Gancho: Voltar a dormir a noite inteira. Oferta: avaliação + exercícios para casa. Chamada: agende pelo WhatsApp.\n3 · Prova — Gancho: O que avaliamos na primeira consulta. Oferta: avaliação completa. Chamada: tire a dúvida no WhatsApp.",
      itens: ["3 abordagens diferentes para testar", "Gancho, dor, oferta e chamada em cada uma", "Fala com o público certo"],
    },
  },
  {
    rotulo: "Descobrir meu cliente ideal",
    sem: {
      titulo: "Pedido genérico",
      pedido: "Quem é o público da minha loja de roupas?",
      resposta: "O público de uma loja de roupas geralmente é formado por pessoas que gostam de moda, buscam qualidade e preço justo, e valorizam um bom atendimento.",
      itens: ["Vale para qualquer loja", "Nada que ajude a escrever um anúncio", "Sem as palavras que o cliente usa"],
    },
    com: {
      titulo: "Com a Vendas IA",
      pedido: "Prompt do “Identifique seu cliente ideal” · moda feminina plus size · ticket médio R$ 180 · vende por Instagram e WhatsApp · clientes que mais voltam",
      resposta: "Cliente ideal: mulher de 28 a 45 anos que trabalha fora e já desistiu de comprar em loja física.\nDor: “nada me serve direito” e medo de errar o tamanho.\nO que ela quer ouvir: provador pelo WhatsApp, troca fácil e foto em corpo real.\nPalavras dela: “caimento”, “que não marque”, “tem no meu número?”",
      itens: ["Perfil específico, com dor e desejo", "As palavras que a cliente usa", "Pronto para virar oferta e anúncio"],
    },
  },
  {
    rotulo: "Montar meu calendário de conteúdo",
    sem: {
      titulo: "Pedido genérico",
      pedido: "Me dá ideias de post para a minha pizzaria",
      resposta: "1. Foto da pizza mais vendida\n2. Bastidores da cozinha\n3. Promoção da semana\n4. Depoimento de cliente\n5. Enquete de sabor favorito",
      itens: ["Ideias soltas, sem sequência", "Nenhuma chamada para pedir", "Igual ao de qualquer pizzaria"],
    },
    com: {
      titulo: "Com a Vendas IA",
      pedido: "Prompt do “Calendário editorial de 30 dias” · pizzaria de bairro · delivery próprio · famílias com crianças · objetivo: pedidos no WhatsApp",
      resposta: "Semana 1 · Dia 1 — Reels: a massa descansando 48h. CTA: “Peça a sua no WhatsApp”.\nDia 2 — Carrossel: como escolher pizza para 4 pessoas. CTA: “Mande quantos são que a gente monta”.\nDia 3 — Stories: enquete de sabor da sexta. CTA: “Quem votar ganha borda recheada”.\n… até o dia 30.",
      itens: ["30 dias com tema, formato e gancho", "Chamada para o WhatsApp em cada post", "Feito para o seu público"],
    },
  },
];

export default async function AtrairClientesLanding() {
  const [oferta, produto, demo] = await Promise.all([
    prisma.oferta.findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } }),
    prisma.infoProduto.findUnique({
      where: { slug: PRODUTO_SLUG },
      include: {
        modulos: {
          orderBy: { numero: "asc" },
          include: { ferramentas: { where: { publicada: true }, select: { slug: true, nome: true, icone: true } } },
        },
      },
    }),
    carregarDemoAnuncio(),
  ]);

  const preco = reais(oferta?.itens[0]?.precoCentavos ?? 6700);
  const precoDe = reais(PRECO_DE_CENTAVOS);
  const modulos = produto?.modulos ?? [];
  const qtd = (numeros: number[]) => modulos.filter(m => numeros.includes(m.numero)).reduce((s, m) => s + m.ferramentas.length, 0);
  const qtdPasso = (n: number) => qtd([n]);
  const totalAtracao = qtd(PASSOS.map(p => p.modulo)) || 50;
  const totalConverter = qtd(CONVERTER) || 40;
  const totalCrescer = qtd(CRESCER) || 10;
  const nomesModulos = (numeros: number[]) => modulos.filter(m => numeros.includes(m.numero)).map(m => m.nome);

  const porSlug = new Map(modulos.flatMap(m => m.ferramentas.map(f => [f.slug, { ...f, modulo: m.nome }] as const)));
  const cards = VITRINE.flatMap(v => {
    const f = porSlug.get(v.slug);
    return f ? [{ rotulo: v.rotulo, nome: f.nome, modulo: f.modulo, icone: f.icone }] : [];
  });
  const alvo = Math.max(0, cards.findIndex(c => c.rotulo === "Anunciar"));
  const cardsMotion = cards.map((c, i) => (i === alvo ? { ...c, nome: DEMO_NOME } : c));

  const precoLinha = (
    <p className="text-sm text-[var(--body)]">
      <s className="text-[var(--muted)]">{precoDe}</s> <strong className="text-[var(--text)] text-lg">{preco}</strong> · pagamento único · acesso imediato
    </p>
  );

  return (
    <Pagina>
      {/* Faixa da oferta do dia: só ela fica presa no alto enquanto a pessoa rola; o topo rola junto */}
      <div className="sticky top-0 z-40 bg-[linear-gradient(90deg,#fbbf24,#f59e0b)] text-[var(--on-acc)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs sm:text-sm font-semibold">
          <span>OFERTA DE HOJE: de <s className="opacity-70">{precoDe}</s> por {preco}</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Encerra hoje às 23h59 · <ContagemHoje /></span>
        </div>
      </div>
      <Topo href={CHECKOUT} preco={preco} fixo={false} />

      {/* 1ª dobra */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute right-[-10rem] top-[-14rem] w-[50rem] h-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.14),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-14 md:pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <Kicker>Sistema de atração com inteligência artificial</Kicker>
            <h1 className="mt-4 font-semibold tracking-[-0.03em] leading-[1.06] text-[2.05rem] md:text-[3.2rem]">
              Atraia mais clientes com IA: <Em>anúncios, ofertas e conteúdo</Em> prontos para o seu negócio.
            </h1>
            <p className="mt-5 text-base md:text-xl text-[var(--body)]">
              {totalAtracao} ferramentas de atração que mostram quem é o seu cliente, criam uma oferta difícil de recusar, escrevem os seus anúncios e montam o seu conteúdo. Personalizadas para o seu negócio e prontas para usar no ChatGPT ou no Claude.
            </p>
            <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              {PASSOS.map((p, i) => (
                <li key={p.modulo} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-white/[.03] px-3 py-1.5">
                    <span className="font-[family-name:var(--f-mono)] text-[11px] text-[var(--acc)]">{i + 1}</span>{p.curto}
                  </span>
                  {i < PASSOS.length - 1 && <ArrowRight size={14} className="text-[var(--muted)]" />}
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Cta href={CHECKOUT} texto={CTA} grande />
              {precoLinha}
            </div>
          </div>
          <div>
            {demo && (
              <MotionPlataforma cards={cardsMotion} alvo={alvo} ferramenta={DEMO_NOME} campos={demo.campos} prompt={demo.prompt} resposta={DEMO_RESPOSTA} />
            )}
          </div>
        </div>
      </section>

      {/* Sem × com */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">Atrair cliente <Em>sem sistema</Em> e com sistema.</h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">Sem a Vendas IA</p>
              <ul className="mt-5 space-y-4">
                {SEM_COM.map(([sem]) => (
                  <li key={sem} className="flex gap-3 text-[var(--body)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center flex-shrink-0"><X size={12} strokeWidth={3} /></span>{sem}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${cartao} p-6 border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Com a Vendas IA</p>
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
            Se marcou pelo menos uma, o problema não é falta de esforço. <strong className="text-[var(--text)]">É falta de sistema.</strong>
          </p>
        </div>
      </section>

      {/* De onde vêm as ferramentas */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <Kicker>De onde vêm as ferramentas</Kicker>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Quem é o cliente e <Em>por que ele compraria de você?</Em></h2>
          <p className="mt-6 text-lg text-[var(--body)] leading-relaxed">
            Antes de estruturar o comercial de mais de 200 empresas, a FluxVenda sempre começa pela mesma pergunta: quem é o cliente e por que ele compraria de você? Os roteiros de pesquisa de público, criação de oferta e atração que usamos nesses projetos viraram ferramentas de IA.
          </p>
        </div>
      </section>

      {/* O Sistema de Atração em 4 passos */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>{totalAtracao} ferramentas · 4 passos</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">O Sistema de Atração <Em>em 4 passos.</Em></h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {PASSOS.map((p, i) => (
              <div key={p.modulo} className={`${cartao} p-6 md:p-7`}>
                <div className="flex items-center justify-between gap-3">
                  <Kicker>Passo {i + 1}</Kicker>
                  <span className="rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-xs text-[var(--body)]">{qtdPasso(p.modulo)} ferramentas</span>
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{p.texto}</p>
                <ul className="mt-4 pt-4 border-t border-[var(--line)] space-y-1.5 text-sm text-[var(--body)]">
                  {p.exemplos.map(e => <li key={e} className="flex gap-2"><Check size={15} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{e}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-2xl border border-[rgba(251,191,36,.35)] bg-[var(--acc-dim)] p-5 text-center text-lg">
            Cada passo alimenta o próximo. <span className="text-[var(--body)]">O público define a oferta, a oferta define o anúncio e o anúncio define o conteúdo.</span>
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Você não precisa aprender <Em>engenharia de prompts.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Cadastre o seu negócio, escolha a ferramenta, copie e cole no ChatGPT ou no Claude.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { passo: "Cadastre o negócio", texto: "Conte uma vez o que você vende, para quem e como. As ferramentas já vêm preenchidas com isso." },
              { passo: "Escolha a ferramenta", texto: "Público, oferta, anúncio ou conteúdo: escolha o que precisa e complete as perguntas do formulário." },
              { passo: "Copie e cole", texto: "A Vendas IA monta um prompt completo e estruturado. Você copia, abre o ChatGPT ou o Claude e cola o comando." },
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
            A Vendas IA não executa a inteligência artificial: ela prepara o comando com as suas informações. A resposta é gerada pelo ChatGPT ou pelo Claude, na sua própria conta, quando você cola o prompt lá.
          </p>
        </div>
      </section>

      {/* Veja na prática */}
      <section id="demonstracao" className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Veja na prática</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">O mesmo pedido. <Em>Duas respostas.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">A diferença entre pedir qualquer coisa à IA e usar uma ferramenta pronta, com o contexto do seu negócio.</p>
          </div>
          <div className="mt-10"><DemoAbas abas={ABAS_DEMO} /></div>
          <div className="mt-10 rounded-2xl border border-[rgba(251,191,36,.35)] bg-[var(--acc-dim)] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-lg font-semibold">Gostou? Tenha o Sistema de Atração completo por {preco}.</p>
            <Cta href={CHECKOUT} texto={CTA} />
          </div>
        </div>
      </section>

      {/* Bônus: converta quem chegar */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Bônus · converta quem chegar</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">De nada adianta atrair se o cliente <Em>some no orçamento.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Por isso você também recebe a Etapa Converter e a Etapa Crescer.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { n: 1, t: `Converter · ${totalConverter} ferramentas`, sub: nomesModulos(CONVERTER).join(" · ") || "Atenda melhor · Negocie mais · Feche vendas · Venda novamente", d: "O que responder ao “qual o preço?”, ao “tá caro” e ao “vou pensar”, e como trazer de volta quem sumiu." },
              { n: 2, t: `Crescer · ${totalCrescer} ferramentas`, sub: nomesModulos(CRESCER).join(" · ") || "Gerencie sua equipe · Planeje seu crescimento", d: "Metas, rotinas da equipe e o plano de vendas do período." },
              { n: 3, t: "Plano Atrair em 7 Dias", sub: "Logo abaixo", d: "Um roteiro de uma semana que leva você do cadastro do negócio até as respostas para quem chegar." },
            ].map(b => (
              <div key={b.n} className={`${cartao} p-6`}>
                <span className="w-11 h-11 rounded-xl bg-[var(--acc-dim)] text-[var(--acc-bright)] flex items-center justify-center"><Gift size={20} /></span>
                <p className="mt-4 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Bônus {b.n}</p>
                <h3 className="mt-1 text-lg font-semibold">{b.t}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{b.sub}</p>
                <p className="mt-3 text-[var(--body)]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plano Atrair em 7 dias */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Bônus 3</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Plano Atrair <Em>em 7 dias.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Uma tarefa por dia, cada uma com um resultado concreto.</p>
          </div>
          <ol className="mt-12 relative border-l border-[var(--line-strong)] ml-4 space-y-7">
            {PLANO_ATRAIR.map(([tarefa, resultado], i) => (
              <li key={tarefa} className="pl-8 relative">
                <span className="absolute -left-[1.15rem] top-0 w-9 h-9 rounded-full border border-[var(--acc)] bg-[var(--canvas)] text-[var(--acc)] flex items-center justify-center font-[family-name:var(--f-mono)] text-xs">{i + 1}</span>
                <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.18em] uppercase text-[var(--muted)]">Dia {i + 1}</p>
                <h3 className="text-lg font-semibold mt-0.5">{tarefa}</h3>
                <p className="mt-1 text-sm text-[var(--body)]"><span className="text-[var(--muted)]">Resultado:</span> {resultado}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-center text-[var(--body)]">
            O dia 7 é estratégico: ele leva você para a Etapa Converter, que é onde o resultado acontece de verdade.
          </p>
        </div>
      </section>

      <Cases />

      {/* A oferta */}
      <section id="oferta" className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-2xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Tudo o que você <Em>recebe hoje.</Em></h2>
          <div className={`${cartao} mt-10 p-7 md:p-10 border-[rgba(251,191,36,.3)] text-left`}>
            <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Principal · Sistema de Atração · {totalAtracao} ferramentas</p>
            <ul className="mt-3 space-y-2.5 text-[var(--body)]">
              {PASSOS.map(p => <li key={p.modulo} className="flex gap-2.5"><Check size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{p.titulo} ({qtdPasso(p.modulo)})</li>)}
            </ul>
            <p className="mt-7 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Bônus</p>
            <ul className="mt-3 space-y-2.5 text-[var(--body)]">
              {[
                `Etapa Converter: ${totalConverter} ferramentas`,
                `Etapa Crescer: ${totalCrescer} ferramentas`,
                "Plano Atrair em 7 Dias",
                "Biblioteca com busca, favoritos e histórico",
              ].map(t => <li key={t} className="flex gap-2.5"><Gift size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
            <div className="mt-8 pt-8 border-t border-[var(--line)]">
              <p className="font-semibold">A conta</p>
              <p className="mt-2 text-[var(--body)] leading-relaxed">
                Uma agência de marketing para pequeno negócio costuma cobrar uma mensalidade, todo mês. Aqui você paga uma vez e cria anúncios, ofertas e conteúdo sempre que precisar.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-[var(--line)] text-center">
              <p className="text-[var(--muted)]">De <s>{precoDe}</s> por</p>
              <p className="text-6xl md:text-7xl font-semibold tracking-[-0.04em] tabular-nums">{preco}</p>
              <p className="mt-2 text-[var(--body)]">Pagamento único. Sem mensalidade. Acesso imediato.</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--acc-dim)] px-3 py-1 text-sm text-[var(--acc-bright)]">
                <Clock size={14} /> Preço de hoje: encerra às 23h59 · <ContagemHoje />
              </p>
              <p className="mt-4 text-sm text-[var(--muted)]">Acesso liberado após a confirmação do pagamento, sem data de expiração. O acesso só é encerrado em caso de reembolso ou estorno da compra.</p>
              <div className="mt-8 flex justify-center"><Cta href={CHECKOUT} texto={CTA} grande /></div>
              <p className="mt-4 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">Pix ou cartão · Compra segura</p>
              <p className="mt-4 text-xs text-[var(--muted)]">Os kits complementares (como o Analisador de Relatórios e o WhatsApp Vendedor) são vendidos separadamente e não fazem parte desta oferta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Garantia dupla */}
      <section className="border-t border-[var(--line)]">
        <FaixaGarantia />
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-20 md:py-24">
          <div className="text-center">
            <ShieldCheck size={40} className="mx-auto text-[var(--acc)]" />
            <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Garantia <Em>dupla.</Em></h2>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6`}>
              <Kicker>Garantia 1</Kicker>
              <h3 className="mt-2 text-xl font-semibold">7 dias incondicionais</h3>
              <p className="mt-2 text-[var(--body)] leading-relaxed">Pediu, devolvemos 100%. É o seu direito de arrependimento (art. 49 do Código de Defesa do Consumidor).</p>
            </div>
            <div className={`${cartao} p-6`}>
              <Kicker>Garantia 2</Kicker>
              <h3 className="mt-2 text-xl font-semibold">Sistema Pronto em 30 dias</h3>
              <p className="mt-2 text-[var(--body)] leading-relaxed">Siga o Plano Atrair em 7 Dias. Se em 30 dias você não tiver o perfil do seu cliente, uma oferta escrita, 3 anúncios prontos para rodar e 30 dias de conteúdo planejado, devolvemos 100% do valor.</p>
            </div>
          </div>
          <p className="mt-8 text-center text-xl text-[var(--text)]">Ou você sai com o seu sistema de atração pronto, <Em>ou recebe o dinheiro de volta.</Em></p>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Perguntas <Em>frequentes.</Em></h2>
          <Faq
            itens={[
              ["A Vendas IA traz clientes para mim?", "Não diretamente. Ela cria o que atrai clientes: público definido, oferta, anúncios e conteúdo. Os clientes chegam quando você publica e, no caso dos anúncios, investe em mídia. Por isso também incluímos as ferramentas para converter quem chegar."],
              ["Preciso investir em anúncio?", "Não é obrigatório. O Passo 4 (conteúdo e WhatsApp) funciona de forma orgânica. Se você anuncia, os Passos 1 a 3 ajudam a investir com mais direção."],
              ["Serve para quem nunca anunciou?", "Sim. O Plano Atrair em 7 Dias começa do zero, descobrindo quem é o seu cliente."],
              ["Substitui uma agência?", "Não substitui uma agência completa, que também cuida da gestão da campanha. O que a Vendas IA faz é colocar nas suas mãos a criação de público, oferta, anúncios e conteúdo."],
              ["Preciso saber criar prompts?", "Não. Você escolhe a ferramenta e responde perguntas simples sobre o seu negócio. A Vendas IA monta o prompt completo e estruturado para você copiar."],
              ["Preciso pagar o ChatGPT ou o Claude?", "Não é obrigatório: os prompts funcionam nas versões gratuitas das duas IAs. Algumas funções dessas plataformas, como limites maiores de uso ou análise de arquivos, podem exigir um plano pago delas — isso é cobrado pela OpenAI ou pela Anthropic, não pela Vendas IA."],
              ["O acesso exige mensalidade?", `Não. É um pagamento único de ${preco}, sem mensalidade da Vendas IA.`],
              ["Os produtos complementares estão incluídos?", "Não. Kits complementares, como o Analisador de Relatórios de Vendas e o WhatsApp Vendedor, são vendidos à parte e podem aparecer como opção no checkout."],
              ["Como recebo o acesso depois da compra?", "Assim que o pagamento é confirmado — no cartão, na hora; no Pix, logo após o pagamento — sua conta é criada e você recebe um e-mail para definir sua senha e entrar."],
              ["Vocês garantem resultado?", "Garantimos o que a Vendas IA controla: o seu sistema de atração pronto. Se em 30 dias, seguindo o Plano Atrair, você não tiver o perfil do cliente, a oferta, 3 anúncios e 30 dias de conteúdo, devolvemos o valor. Não prometemos número de clientes nem de vendas, porque isso depende da verba, do mercado e da execução."],
            ]}
          />
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Seus próximos clientes estão procurando alguém como você. <Em>Faça eles te encontrarem.</Em></h2>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Cta href={CHECKOUT} texto={CTA} preco={preco} grande />
            {precoLinha}
          </div>
        </div>
      </section>

      <Rodape />
      <BotaoFixoCelular href={CHECKOUT} texto={`Quero atrair mais clientes · ${preco}`} />
    </Pagina>
  );
}
