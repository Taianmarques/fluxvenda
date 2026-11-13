import type { ReactNode } from "react";
import { Check, Clock, Copy, MessageSquareText, Plug, PlayCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BotaoFixoCelular, cartao, Cta, Em, FaixaGarantia, Faq, Kicker, Pagina, reais, Rodape, Topo } from "../_ui";
import { Cases } from "../_ferramentas/Cases";
import { ContagemHoje } from "../_ferramentas/ContagemHoje";
import { MotionTrafego } from "./MotionTrafego";

// Corpo das landings do "Gestor de Tráfego com IA" (cada página em /vendas-ia só muda o título do
// topo): curso em vídeo (estilo área de membros) que ensina a conectar a conta de anúncios do Meta
// ao Claude ou ao ChatGPT pelo conector oficial de Meta Ads e a gerenciar as campanhas conversando,
// mais uma biblioteca de comandos prontos.
// O preço vem da oferta OFERTA_SLUG (cadastrada em /admin/ofertas); enquanto ela não existir,
// mostra o preço padrão e o checkout dá 404. A grade abaixo é a do curso: ajuste quando gravar.

const OFERTA_SLUG = "gestor-trafego-ia";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;
const PRECO_PADRAO_CENTAVOS = 6700;
// Preço "de" e contagem até 23h59 são da campanha (não vêm da oferta), como na landing Atrair clientes
const PRECO_DE_CENTAVOS = 19700;
const CTA = "QUERO A IA CUIDANDO DOS MEUS ANÚNCIOS";

// Grade do curso: cada módulo tem aulas em vídeo e comandos prontos para colar no chat conectado
const MODULOS = [
  {
    titulo: "Conectando o Meta Ads à IA",
    texto: "Passo a passo para ligar a sua conta de anúncios ao Claude ou ao ChatGPT pelo conector oficial, com as permissões certas.",
    aulas: ["Conectando no Claude", "Conectando no ChatGPT", "Permissões, segurança e como desconectar"],
    comandos: ["Teste de conexão da conta"],
  },
  {
    titulo: "Raio-x da sua conta",
    texto: "Os primeiros pedidos: o que está rodando, quanto já gastou e onde está o dinheiro desperdiçado.",
    aulas: ["Pedindo o resumo da conta", "Encontrando campanhas que dão prejuízo", "Comparando períodos"],
    comandos: ["Raio-x da conta", "Caça ao desperdício"],
  },
  {
    titulo: "Criando campanhas pela conversa",
    texto: "Explique o que você vende e para quem. A IA monta a campanha, o público e o orçamento, e você confirma antes de publicar.",
    aulas: ["Campanha de mensagens no WhatsApp", "Campanha de vendas e cadastros", "Revisando antes de publicar"],
    comandos: ["Criar campanha de WhatsApp", "Criar campanha de vendas", "Checklist antes de publicar"],
  },
  {
    titulo: "Públicos que compram",
    texto: "Público aberto, interesses, remarketing e semelhantes, criados e ajustados pelo chat.",
    aulas: ["Quando usar cada público", "Remarketing de quem já interagiu", "Públicos semelhantes de clientes"],
    comandos: ["Sugerir públicos", "Montar remarketing"],
  },
  {
    titulo: "Criativos e textos",
    texto: "Ganchos, textos e roteiros de vídeo para o seu público, e a IA mostra quais anúncios estão cansando.",
    aulas: ["O que faz um anúncio parar o scroll", "Variações para testar", "Quando trocar o criativo"],
    comandos: ["Gerar variações de anúncio", "Roteiro de vídeo curto", "Detectar criativo cansado"],
  },
  {
    titulo: "Lendo as métricas com a IA",
    texto: "CPM, CTR, custo por conversa e frequência explicados em português, direto dos números da sua conta.",
    aulas: ["As métricas que importam", "Anúncio, público ou oferta: onde está o problema", "Quando esperar e quando mexer"],
    comandos: ["Diagnóstico da campanha", "Relatório da semana"],
  },
  {
    titulo: "Otimizar e escalar",
    texto: "Pausar o que não vende, aumentar a verba do que funciona e testar novos públicos, pedindo pelo chat.",
    aulas: ["Pausando e redistribuindo verba", "Escalando sem perder resultado", "Testes A/B pela conversa"],
    comandos: ["Plano de otimização", "Escalar campanha vencedora"],
  },
  {
    titulo: "Sua rotina de 20 minutos",
    texto: "O que pedir à IA toda segunda-feira para manter as campanhas saudáveis sem passar o dia no Gerenciador.",
    aulas: ["A rotina semanal completa", "Alertas que merecem atenção", "Montando o relatório para o sócio ou o cliente"],
    comandos: ["Rotina de segunda-feira", "Relatório para o cliente"],
  },
];

const SEM_COM: [string, string][] = [
  ["Se perde nas telas do Gerenciador de Anúncios", "Pede em português e a IA faz na sua conta"],
  ["Paga agência todo mês sem entender o relatório", "Pergunta à IA e recebe a explicação com os seus números"],
  ["Demora para perceber o anúncio que dá prejuízo", "Raio-x da conta em segundos"],
  ["Não sabe se o problema é o anúncio ou a oferta", "Diagnóstico com os dados reais da campanha"],
  ["Desliga a campanha no segundo dia", "Plano de teste com prazo e critério"],
  ["Gasta horas por semana mexendo em campanha", "Rotina de 20 minutos por semana pelo chat"],
];

const FRASES = [
  "O Gerenciador de Anúncios parece um painel de avião.",
  "Paguei agência e não sei para onde foi o dinheiro.",
  "Já impulsionei post e não veio ninguém.",
  "Não sei qual anúncio está dando resultado.",
  "Não tenho tempo para acompanhar campanha todo dia.",
  "Tenho medo de queimar dinheiro em anúncio.",
];

// Comparação (colunas na ordem de OPCOES; o preço do Gestor entra na página, vindo da oferta)
const OPCOES = ["Agência", "Fazer sozinho", "Gestor com IA"];
function linhasComparacao(preco: string): [string, string, string, string][] {
  return [
    ["Custo", "R$ 1.500 a 3.000 por mês", "Grátis, mas custa caro em erros", `${preco}, uma vez`],
    ["Seu tempo", "Pouco, mas sem controle", "Muito", "20 min por semana"],
    ["Controle do dinheiro", "Da agência", "Seu, mas sem método", "Seu, com travas"],
  ];
}

// O problema invisível: o que faz perder dinheiro com números que parecem bons. O comando é um dos
// da grade (MODULOS), para a seção apontar a solução que o aluno recebe.
const VAZAMENTOS = [
  { nome: "Criativo cansado", texto: "O mesmo público já viu o anúncio várias vezes. O clique cai, o custo sobe e o painel ainda parece normal.", comando: "Detectar criativo cansado" },
  { nome: "Falso vencedor", texto: "O anúncio com o clique mais barato nem sempre é o que traz cliente. Às vezes ele só atrai curioso.", comando: "Diagnóstico da campanha" },
  { nome: "Verba no lugar errado", texto: "A maior parte do dinheiro vai para a campanha que menos traz conversas, e ninguém percebe.", comando: "Caça ao desperdício" },
  { nome: "Públicos disputando entre si", texto: "Conjuntos diferentes mirando as mesmas pessoas encarecem o seu próprio anúncio.", comando: "Sugerir públicos" },
  { nome: "Escala apressada", texto: "Dobrar a verba de uma vez no anúncio que está indo bem costuma fazer o custo disparar.", comando: "Escalar campanha vencedora" },
  { nome: "Teste desligado cedo", texto: "Pausar a campanha no segundo dia, antes de ela aprender, joga fora o que já foi investido.", comando: "Plano de otimização" },
];

// Decisão em 3 zonas: cada campanha é comparada com a meta de custo por cliente do aluno
const ZONAS = [
  { nome: "Cortar", cor: "red", quando: "Gasta e não traz conversa, ou o custo por cliente está muito acima da sua meta.", acao: "Pausar e passar a verba para o que funciona." },
  { nome: "Ajustar", cor: "amber", quando: "Traz clientes, mas acima da meta, ou o criativo começou a cansar.", acao: "Trocar criativo ou público e manter a verba." },
  { nome: "Escalar", cor: "emerald", quando: "Custo por cliente abaixo da meta e estável há alguns dias.", acao: "Aumentar a verba aos poucos, sem perder o resultado." },
] as const;
const COR_ZONA = {
  red: { borda: "border-red-500/35", fundo: "bg-red-500/[.07]", texto: "text-red-300", ponto: "bg-red-400" },
  amber: { borda: "border-[rgba(251,191,36,.4)]", fundo: "bg-[var(--acc-dim)]", texto: "text-[var(--acc-bright)]", ponto: "bg-[var(--acc)]" },
  emerald: { borda: "border-emerald-500/35", fundo: "bg-emerald-500/[.07]", texto: "text-emerald-300", ponto: "bg-emerald-400" },
};

// Objeções que travam a compra, respondidas no meio da página (logo depois da demonstração)
const OBJECOES: [string, string][] = [
  ["A IA vai gastar meu dinheiro sem eu saber?", "Quem define a verba é você. No primeiro módulo você aprende a configurar a IA para mostrar o que vai fazer e só publicar, pausar ou mudar orçamento depois da sua confirmação."],
  ["Não entendo de tecnologia. Vou conseguir?", "Se você manda mensagem no WhatsApp, consegue. A conexão é feita uma vez, com aula tela por tela, e depois é conversa em português."],
  ["Já tenho agência. Por que eu compraria?", "Para saber o que está sendo feito com o seu dinheiro. Em minutos você pede o raio-x da conta e confere o relatório da agência. Se quiser, assume as campanhas e corta a mensalidade."],
  ["Nunca anunciei. É para mim?", "É. O curso começa da conta zerada e você sobe a primeira campanha com verba pequena, sabendo o que cada número significa."],
];

const PARA_QUEM_E = [
  "Donos de negócio que vendem pelo WhatsApp ou pelo Instagram",
  "Quem já impulsiona post e quer anunciar do jeito certo",
  "Quem paga agência e quer entender ou cortar esse custo",
  "Quem nunca anunciou e quer começar com pouca verba",
  "Clínicas, prestadores de serviço, lojas e negócios locais",
  "Quem quer cuidar dos anúncios em 20 minutos por semana",
];
const PARA_QUEM_NAO_E = [
  "Quem quer clientes sem investir em anúncios",
  "Quem espera que a IA faça tudo sem você olhar",
  "Quem não quer aprovar as decisões da própria conta",
  "Quem não usa ou não pode anunciar no Facebook e no Instagram",
  "Quem procura fórmula de vendas garantidas",
  "Contas com verba alta e muitas campanhas que precisam de equipe dedicada",
];

// Conversa da demonstração (números ilustrativos, avisado na tela)
const CONVERSA_DEMO: { de: "voce" | "ia"; texto: string; tabela?: [string, string][] }[] = [
  { de: "voce", texto: "Crie uma campanha de mensagens no WhatsApp para a minha clínica. R$ 30 por dia, mulheres de 30 a 55 anos perto de mim." },
  {
    de: "ia",
    texto: "Montei a campanha. Antes de publicar, confira:",
    tabela: [
      ["Objetivo", "Mensagens no WhatsApp"],
      ["Público", "Mulheres, 30 a 55 anos, raio de 8 km"],
      ["Orçamento", "R$ 30/dia"],
      ["Anúncios", "3 versões para teste"],
    ],
  },
  { de: "ia", texto: "Os 3 anúncios usam ganchos diferentes: dor, resultado e bastidor. Posso publicar?" },
  { de: "voce", texto: "Pode publicar." },
  { de: "ia", texto: "Publicada. A campanha entra em análise no Meta e costuma começar a rodar em algumas horas. Em 3 dias, peça o raio-x para ver qual anúncio está trazendo conversas mais baratas." },
];

export async function LandingTrafego({ titulo }: { titulo: ReactNode }) {
  const oferta = await prisma.oferta
    .findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } })
    .catch(() => null);
  const preco = reais(oferta?.itens[0]?.precoCentavos ?? PRECO_PADRAO_CENTAVOS);
  const precoDe = reais(PRECO_DE_CENTAVOS);
  const comparacao = linhasComparacao(preco);
  const totalComandos = MODULOS.reduce((s, m) => s + m.comandos.length, 0);
  const totalAulas = MODULOS.reduce((s, m) => s + m.aulas.length, 0);

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
            <Kicker>Meta Ads conectado ao Claude e ao ChatGPT</Kicker>
            <h1 className="mt-4 font-semibold tracking-[-0.03em] leading-[1.06] text-[2.05rem] md:text-[3.2rem]">
              {titulo}
            </h1>
            <p className="mt-5 text-base md:text-xl text-[var(--body)]">
              Conecte sua conta de anúncios ao Claude ou ao ChatGPT e peça em português: “crie uma campanha de WhatsApp”, “qual anúncio está dando prejuízo?”, “passe a verba para o que vende”. A IA lê os números da sua conta e faz, com a sua confirmação.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-sm">
              {[
                { Icone: PlayCircle, t: `${MODULOS.length} módulos em vídeo` },
                { Icone: MessageSquareText, t: `${totalComandos} comandos prontos` },
                { Icone: Plug, t: "Conector oficial de Meta Ads" },
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

          {/* Como funciona, animado: conectar, pedir, a IA ler os números e aplicar */}
          <MotionTrafego />
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
            Agora a IA entra na sua conta de anúncios. <strong className="text-[var(--text)]">Você só precisa saber o que pedir.</strong>
          </p>
        </div>
      </section>

      {/* Sem × com */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">Brigar com o Gerenciador <Em>ou conversar com a IA.</Em></h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">Do jeito de sempre</p>
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

      {/* O problema invisível */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <Kicker>O problema invisível</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Sua conta pode estar perdendo dinheiro <Em>mesmo quando parece tudo bem.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Seis vazamentos que não aparecem olhando o painel por cima. Para cada um, você recebe o comando que faz a IA encontrar na sua conta.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VAZAMENTOS.map((v, i) => (
              <div key={v.nome} className={`${cartao} p-6 flex flex-col`}>
                <span className="font-[family-name:var(--f-mono)] text-[11px] text-red-300">VAZAMENTO {String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-xl font-semibold">{v.nome}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed flex-1">{v.texto}</p>
                <p className="mt-4 pt-4 border-t border-[var(--line)] flex items-center gap-2 text-sm text-[var(--acc-bright)]">
                  <MessageSquareText size={15} className="flex-shrink-0" /> Comando: {v.comando}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Como funciona</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Conecte, peça e <Em>confirme.</Em></h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { Icone: Plug, passo: "Conecte a conta", texto: "A primeira aula mostra, tela por tela, como ligar a sua conta de anúncios ao Claude ou ao ChatGPT pelo conector oficial." },
              { Icone: Copy, passo: "Peça em português", texto: "Use os comandos prontos do curso ou escreva do seu jeito: criar, analisar, pausar, ajustar verba, montar relatório." },
              { Icone: ShieldCheck, passo: "Confirme antes de mudar", texto: "A IA mostra o que vai fazer e você aprova. No curso você aprende a pedir confirmação para qualquer alteração na conta." },
            ].map(({ Icone, passo, texto }, i) => (
              <div key={passo} className={`${cartao} p-6`}>
                <div className="flex items-center justify-between">
                  <Kicker>Passo {i + 1}</Kicker>
                  <Icone size={18} className="text-[var(--acc)]" />
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{passo}</h3>
                <p className="mt-2 text-[var(--body)] leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração: conversa com a conta conectada */}
      <section id="demonstracao" className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Veja na prática</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Uma frase. <Em>A campanha no ar.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Exemplo de uma clínica de estética usando o comando “Criar campanha de WhatsApp”.</p>
          </div>
          <div className={`${cartao} mt-12 p-5 md:p-7 space-y-4`}>
            {CONVERSA_DEMO.map((m, i) => (
              <div key={i} className={m.de === "voce" ? "flex justify-end" : "flex justify-start"}>
                <div className={m.de === "voce"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-white/[.08] px-4 py-2.5"
                  : "max-w-[92%] rounded-2xl rounded-bl-md border border-[rgba(251,191,36,.3)] bg-[var(--acc-dim)] px-4 py-3"}>
                  {m.de === "ia" && <p className="mb-1 flex items-center gap-1.5 font-[family-name:var(--f-mono)] text-[10px] tracking-[0.16em] uppercase text-[var(--acc)]"><Sparkles size={12} /> IA</p>}
                  <p className="leading-relaxed">{m.texto}</p>
                  {m.tabela && (
                    <dl className="mt-3 text-sm">
                      {m.tabela.map(([rotulo, valor]) => (
                        <div key={rotulo} className="flex justify-between gap-4 border-t border-[var(--line)] py-1.5">
                          <dt className="text-[var(--muted)]">{rotulo}</dt>
                          <dd className="text-right">{valor}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[var(--muted)]">Conversa e números ilustrativos. A resposta real depende da sua conta e da IA que você usar.</p>
        </div>
      </section>

      {/* Decisão em 3 zonas */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <Kicker>O semáforo da conta</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Nada de achismo. <Em>Cortar, ajustar ou escalar.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Você define quanto pode pagar por cliente. A IA compara cada campanha com essa meta e coloca cada uma em uma zona.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {ZONAS.map(z => {
              const c = COR_ZONA[z.cor];
              return (
                <div key={z.nome} className={`rounded-2xl border ${c.borda} ${c.fundo} p-6`}>
                  <p className={`flex items-center gap-2 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase ${c.texto}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${c.ponto}`} /> Zona {z.nome.toLowerCase()}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold">{z.nome}</h3>
                  <p className="mt-3 text-sm text-[var(--muted)]">Quando</p>
                  <p className="text-[var(--body)] leading-relaxed">{z.quando}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">O que fazer</p>
                  <p className="font-semibold leading-relaxed">{z.acao}</p>
                </div>
              );
            })}
          </div>
          <div className={`${cartao} mt-6 p-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-center`}>
            {["Sua meta de custo por cliente", "Números da sua conta", "Zona de cada campanha", "Você aprova a ação"].map((t, i, a) => (
              <span key={t} className="inline-flex items-center gap-3">
                <span className={i === a.length - 1 ? "font-semibold text-[var(--acc-bright)]" : "text-[var(--body)]"}>{t}</span>
                {i < a.length - 1 && <span className="text-[var(--muted)]">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Objeções no meio da página */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">Se você está pensando nisso, <Em>leia aqui.</Em></h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {OBJECOES.map(([q, r]) => (
              <div key={q} className={`${cartao} p-6`}>
                <h3 className="text-xl font-semibold leading-snug">“{q}”</h3>
                <p className="mt-3 text-[var(--body)] leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center"><Cta href={CHECKOUT} texto={CTA} /></div>
        </div>
      </section>

      {/* Grade do curso */}
      <section id="conteudo" className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>{MODULOS.length} módulos · {totalAulas} aulas · {totalComandos} comandos prontos</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Da conexão <Em>à rotina de 20 minutos.</Em></h2>
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
                    {m.comandos.map(c => <li key={c} className="flex gap-2"><MessageSquareText size={15} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{c}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é / para quem não é */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">É para você? <Em>Seja sincero.</Em></h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <div className={`${cartao} p-6 border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">Para quem é</p>
              <ul className="mt-5 space-y-4">
                {PARA_QUEM_E.map(t => (
                  <li key={t} className="flex gap-3 text-[var(--text)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-[var(--acc)] text-[var(--on-acc)] flex items-center justify-center flex-shrink-0"><Check size={12} strokeWidth={3} /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${cartao} p-6`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--muted)]">Para quem não é</p>
              <ul className="mt-5 space-y-4">
                {PARA_QUEM_NAO_E.map(t => (
                  <li key={t} className="flex gap-3 text-[var(--body)]">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center flex-shrink-0"><X size={12} strokeWidth={3} /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Cases />

      {/* Comparação: agência × fazer sozinho × Gestor com IA */}
      <section id="comparacao" className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Comparação</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Três jeitos de cuidar dos anúncios. <Em>Compare.</Em></h2>
          </div>

          {/* Computador: tabela */}
          <div className={`${cartao} mt-12 hidden md:block overflow-hidden`}>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-5 w-[22%]" />
                  {OPCOES.map((o, i) => (
                    <th key={o} className={`p-5 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase font-normal ${i === 2 ? "bg-[var(--acc-dim)] text-[var(--acc)]" : "text-[var(--muted)]"}`}>{o}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparacao.map(([criterio, ...valores]) => (
                  <tr key={criterio} className="border-t border-[var(--line)]">
                    <th scope="row" className="p-5 font-semibold">{criterio}</th>
                    {valores.map((v, i) => (
                      <td key={i} className={`p-5 ${i === 2 ? "bg-[var(--acc-dim)] font-semibold text-[var(--text)]" : "text-[var(--body)]"}`}>
                        {i === 2 && <Check size={15} className="inline mr-1.5 -mt-0.5 text-[var(--acc)]" strokeWidth={3} />}{v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: um cartão por opção */}
          <div className="mt-10 grid gap-4 md:hidden">
            {OPCOES.map((o, i) => (
              <div key={o} className={`${cartao} p-6 ${i === 2 ? "border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.07),rgba(255,255,255,.01))]" : ""}`}>
                <p className={`font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase ${i === 2 ? "text-[var(--acc)]" : "text-[var(--muted)]"}`}>{o}</p>
                <dl className="mt-4 space-y-3">
                  {comparacao.map(([criterio, ...valores]) => (
                    <div key={criterio}>
                      <dt className="text-xs text-[var(--muted)]">{criterio}</dt>
                      <dd className={i === 2 ? "font-semibold" : "text-[var(--body)]"}>{valores[i]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                "Passo a passo para conectar o Meta Ads ao Claude e ao ChatGPT",
                `${totalComandos} comandos prontos para criar, analisar e otimizar campanhas`,
                "Rotina semanal de 20 minutos",
                "Acesso pelo celular ou computador, no seu ritmo",
              ].map(t => <li key={t} className="flex gap-2.5"><Check size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
            <div className="mt-8 pt-8 border-t border-[var(--line)]">
              <p className="font-semibold">A conta</p>
              <p className="mt-2 text-[var(--body)] leading-relaxed">
                Um gestor de tráfego costuma cobrar uma mensalidade para cuidar das campanhas, além da verba dos anúncios. Aqui você paga uma vez e aprende a cuidar das suas com a IA fazendo o trabalho operacional.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-[var(--line)] text-center">
              <p className="text-[var(--muted)]">De <s>{precoDe}</s> por</p>
              <p className="text-6xl md:text-7xl font-semibold tracking-[-0.04em] tabular-nums">{preco}</p>
              <p className="mt-2 text-[var(--body)]">Pagamento único. Sem mensalidade. Acesso imediato.</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--acc-dim)] px-3 py-1 text-sm text-[var(--acc-bright)]">
                <Clock size={14} /> Preço de hoje: encerra às 23h59 · <ContagemHoje />
              </p>
              <p className="mt-4 text-sm text-[var(--muted)]">A verba dos anúncios é paga direto ao Meta, e eventuais planos do Claude ou do ChatGPT são cobrados por essas plataformas. Nenhum dos dois está incluído.</p>
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
            Assista às aulas, conecte a sua conta e use os comandos. Se não gostar, peça o reembolso em até 7 dias e devolvemos 100% do valor, sem perguntas. É o seu direito de arrependimento (art. 49 do Código de Defesa do Consumidor).
          </p>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Perguntas <Em>frequentes.</Em></h2>
          <Faq
            itens={[
              ["Como a IA acessa a minha conta de anúncios?", "Pelo conector oficial de Meta Ads disponível no Claude e no ChatGPT. Você autoriza o acesso com o seu login do Facebook, e o Vendas IA não recebe a sua senha nem os dados da sua conta."],
              ["Preciso pagar o Claude ou o ChatGPT?", "O uso de conectores pode depender do plano de cada plataforma. Na primeira aula mostramos o que é necessário em cada uma. Esses planos são cobrados pela Anthropic ou pela OpenAI, não pelo Vendas IA."],
              ["Quanto preciso investir em anúncios?", "Isso é seu e é pago direto ao Meta. O valor do curso não inclui verba de anúncio."],
              ["Substitui um gestor de tráfego?", "Para muitos pequenos negócios, sim: você passa a criar, acompanhar e otimizar as próprias campanhas. Contas grandes, com várias campanhas e verba alta, ainda podem precisar de um profissional dedicado."],
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
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Pare de brigar com o Gerenciador. <Em>Peça para a IA.</Em></h2>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Cta href={CHECKOUT} texto={CTA} preco={preco} grande />
            {precoLinha}
          </div>
        </div>
      </section>

      <Rodape avisos={["Meta, Facebook e Instagram são marcas da Meta Platforms, Inc. O Vendas IA não é afiliado à Meta. O conector de Meta Ads é oferecido pelas plataformas, não pelo Vendas IA."]} />
      <BotaoFixoCelular href={CHECKOUT} texto={`Quero o Gestor de Tráfego · ${preco}`} />
    </Pagina>
  );
}
