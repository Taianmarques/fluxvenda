import type { ReactNode } from "react";
import { Check, Copy, ExternalLink, Film, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CentralIcone } from "@/lib/central-icons";
import { carregarPlano7Dias } from "@/lib/plano-7-dias";
import { BotaoFixoCelular, cartao, Cta, Em, FaixaGarantia, Faq, Kicker, Pagina, reais, Rodape, Topo } from "../_ui";
import { carregarDemoAnuncio, DEMO_NOME, DEMO_RESPOSTA } from "./demo";
import { MotionPlataforma } from "./MotionPlataforma";
import { MotionComparacao } from "./MotionComparacao";

// Landings "100 ferramentas" (tráfego de anúncios do Instagram/Facebook), mesmo visual da /vendas-ia.
// O corpo é um só; cada página muda o topo (eyebrow, headline, subheadline) e o título da seção de
// problema — dá para testar ângulos de anúncio diferentes sem duplicar a página.
// Tudo o que é número ou nome de ferramenta vem do banco: preço da oferta, módulos, ferramentas
// citadas e o plano de 7 dias. A animação do topo mostra o prompt REAL montado pela plataforma
// (ferramenta demo-criar-anuncio, mesmo montador da biblioteca) com um exemplo preenchido.
// A plataforma não executa IA: prepara o prompt, que a pessoa copia para o ChatGPT ou o Claude.

const OFERTA_SLUG = "vendas-ia-ferramentas";
const PRODUTO_SLUG = "100-prompts-vendas";
const CHECKOUT = `/comprar/${OFERTA_SLUG}`;

export type TopoLanding = {
  eyebrow: string;
  titulo: ReactNode;
  tituloLongo?: boolean; // headline grande demais para o tamanho padrão
  subtitulo: (totalFerramentas: number) => ReactNode;
  tituloProblema: ReactNode;
};

// Ferramentas reais mostradas na demonstração visual e nas dores (slug → rótulo do card)
const VITRINE = [
  { slug: "crie-anuncios-para-meta-ads", rotulo: "Criar anúncios" },
  { slug: "identifique-seu-cliente-ideal", rotulo: "Encontrar clientes" },
  { slug: "recupere-orcamentos-antigos", rotulo: "Recuperar orçamentos" },
  { slug: "responda-ao-cliente-que-achou-caro", rotulo: "Responder objeções" },
  { slug: "monte-plano-de-vendas-para-30-dias", rotulo: "Planejar vendas" },
];

// Link de vídeo → player incorporado (sem autoplay). YouTube e Vimeo viram iframe; .mp4/.webm, <video>
function videoEmbed(url: string | null | undefined): { tipo: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return { tipo: "video", src: url };
  return null;
}

function Video({ v }: { v: NonNullable<ReturnType<typeof videoEmbed>> }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-black">
      {v.tipo === "iframe"
        ? <iframe src={v.src} title="Demonstração da Vendas IA" className="w-full h-full" allow="encrypted-media; picture-in-picture; fullscreen" loading="lazy" />
        : <video src={v.src} controls playsInline preload="metadata" className="w-full h-full" />}
    </div>
  );
}


export async function LandingFerramentas({ topo }: { topo: TopoLanding }) {
  const [oferta, produto, demo, plano] = await Promise.all([
    prisma.oferta.findUnique({ where: { slug: OFERTA_SLUG }, include: { itens: { where: { papel: "PRINCIPAL" }, take: 1 } } }),
    prisma.infoProduto.findUnique({
      where: { slug: PRODUTO_SLUG },
      include: {
        modulos: {
          orderBy: { numero: "asc" },
          include: { ferramentas: { where: { publicada: true }, select: { slug: true, nome: true, icone: true, continuacao: true } } },
        },
      },
    }),
    carregarDemoAnuncio(),
    carregarPlano7Dias(),
  ]);

  const precoCentavos = oferta?.itens[0]?.precoCentavos ?? 6700;
  const preco = reais(precoCentavos);
  const modulos = (produto?.modulos ?? []).filter(m => m.ferramentas.length > 0);
  const totalFerramentas = modulos.reduce((s, m) => s + m.ferramentas.length, 0) || 100;
  const temContinuacao = modulos.some(m => m.ferramentas.some(f => f.continuacao.trim()));
  const video = videoEmbed(oferta?.videoDemoUrl);

  const porSlug = new Map(modulos.flatMap(m => m.ferramentas.map(f => [f.slug, { ...f, modulo: m.nome }] as const)));
  const cards = VITRINE.flatMap(v => {
    const f = porSlug.get(v.slug);
    return f ? [{ rotulo: v.rotulo, nome: f.nome, modulo: f.modulo, icone: f.icone }] : [];
  });
  const nomeDe = (slug: string, reserva: string) => porSlug.get(slug)?.nome ?? reserva;

  // Na animação, o card de anúncios é o da ferramenta de exemplo
  const alvo = Math.max(0, cards.findIndex(c => c.rotulo === "Criar anúncios"));
  const cardsMotion = cards.map((c, i) => (i === alvo ? { ...c, nome: DEMO_NOME } : c));

  const ctaPrincipal = `Quero acessar minhas ${totalFerramentas} ferramentas`;

  return (
    <Pagina>
      <Topo href={CHECKOUT} preco={preco} />

      {/* 1ª dobra */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute right-[-10rem] top-[-14rem] w-[50rem] h-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.14),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-14 md:pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <Kicker>{topo.eyebrow}</Kicker>
            <h1 className={`mt-4 font-semibold tracking-[-0.03em] leading-[1.06] ${topo.tituloLongo ? "text-[1.95rem] md:text-[2.9rem]" : "text-[2.15rem] md:text-[3.5rem]"}`}>
              {topo.titulo}
            </h1>
            <p className="mt-5 text-base md:text-xl text-[var(--body)]">{topo.subtitulo(totalFerramentas)}</p>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <Cta href={CHECKOUT} texto={ctaPrincipal.toUpperCase()} grande />
              <p className="text-sm text-[var(--body)]"><strong className="text-[var(--text)] text-lg">{preco}</strong> — pagamento único</p>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--body)]">
              {["Sem mensalidade da Vendas IA", "Para usar no ChatGPT ou no Claude", "Fácil de personalizar", "Pagamento único"].map(t => (
                <li key={t} className="flex gap-2"><Check size={16} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
          <div>
            {video ? <Video v={video} /> : demo && (
              <MotionPlataforma
                cards={cardsMotion} alvo={alvo} ferramenta={DEMO_NOME}
                campos={demo.campos} prompt={demo.prompt} resposta={DEMO_RESPOSTA}
              />
            )}
          </div>
        </div>
      </section>

      {/* O problema */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center leading-[1.1]">
            {topo.tituloProblema}
          </h2>
          <div className="mt-12 grid md:grid-cols-2 gap-4">
            {[
              { dor: "Não sei o que postar ou anunciar.", uso: nomeDe("crie-anuncios-para-meta-ads", "Crie anúncios para Meta Ads"), mod: "Anúncios e aquisição" },
              { dor: "O cliente pede orçamento e desaparece.", uso: nomeDe("recupere-orcamentos-antigos", "Recupere orçamentos antigos"), mod: "Follow-up e fechamento" },
              { dor: "Travo quando o cliente diz que está caro.", uso: nomeDe("responda-ao-cliente-que-achou-caro", "Responda ao cliente que achou caro"), mod: "Negociação e objeções" },
              { dor: "Não tenho tempo para organizar campanhas e estratégias.", uso: nomeDe("monte-plano-de-vendas-para-30-dias", "Monte plano de vendas para 30 dias"), mod: "Planejamento comercial" },
            ].map((c, i) => (
              <div key={c.dor} className={`${cartao} p-6`}>
                <span className="font-[family-name:var(--f-mono)] text-xs text-[var(--acc)]">0{i + 1}</span>
                <p className="mt-3 text-lg font-semibold leading-snug">“{c.dor}”</p>
                <p className="mt-4 pt-4 border-t border-[var(--line)] text-sm text-[var(--body)]">
                  <span className="text-[var(--muted)]">Na Vendas IA:</span> <strong className="text-[var(--text)]">{c.uso}</strong> <span className="text-[var(--muted)]">· {c.mod}</span>
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
            <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Você não precisa aprender <Em>engenharia de prompts.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">Escolha uma ferramenta, personalize para seu negócio e utilize no ChatGPT ou Claude.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { passo: "Escolha", texto: "Selecione a ferramenta certa para o seu problema comercial: anúncio, objeção, follow-up, oferta…" },
              { passo: "Personalize", texto: "Preencha um formulário simples com informações da empresa, do produto e da situação." },
              { passo: "Utilize", texto: "A Vendas IA monta um prompt completo e estruturado. Você copia, abre o ChatGPT ou o Claude e cola o comando." },
            ].map((p, i) => (
              <div key={p.passo} className={`${cartao} p-6 relative`}>
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

      {/* Vídeo demonstrativo (quando o vídeo já está na 1ª dobra, não repete) */}
      {!video && (
        <section className="border-t border-[var(--line)]">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-20 md:py-28">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Veja a Vendas IA funcionando <Em>em 60 segundos.</Em></h2>
            <div className="mt-10 aspect-video w-full rounded-2xl border border-dashed border-[var(--line-strong)] bg-white/[.02] flex flex-col items-center justify-center text-center px-6">
              <Film size={36} className="text-[var(--acc)]" />
              <p className="mt-4 font-semibold">Vídeo demonstrativo em produção</p>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-md">Enquanto isso, veja logo abaixo a diferença que um prompt bem montado faz.</p>
            </div>
          </div>
        </section>
      )}

      {/* O mesmo pedido, duas respostas (motion) */}
      <section id="demonstracao" className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>Veja na prática</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">O mesmo pedido. <Em>Duas respostas.</Em></h2>
            <p className="mt-4 text-lg text-[var(--body)]">A diferença entre pedir qualquer coisa à IA e usar uma ferramenta pronta, com o contexto do seu cliente.</p>
          </div>
          <div className="mt-10">
            <MotionComparacao
              sem={{
                titulo: "Pedido genérico",
                pedido: "faz uma mensagem pra cobrar o cliente que não respondeu o orçamento",
                resposta: "Olá, tudo bem? Gostaria de saber se você teve a oportunidade de analisar nossa proposta. Fico à disposição para esclarecer qualquer dúvida. Aguardo seu retorno!",
                itens: ["Serviria para qualquer empresa", "Não usa nada da conversa com o cliente", "Fácil de ignorar"],
              }}
              com={{
                titulo: "Com o prompt da Vendas IA",
                pedido: "Prompt da ferramenta “Recuperar orçamento parado” · marcenaria · armário de R$ 8.900 · cliente sumiu há 5 dias · objetivo: retomar a conversa",
                resposta: "Oi, Carla! Conseguiu ver com o seu marido o projeto do armário da cozinha? Se quiser, ajusto alguma medida antes de vocês decidirem 😊\n\nQuando enviar: hoje, no fim da tarde.",
                itens: ["Usa o contexto real da conversa", "Uma pergunta só, fácil de responder", "Sem desconto e sem pressão"],
              }}
            />
          </div>
          <div className="mt-10 rounded-2xl border border-[rgba(251,191,36,.35)] bg-[var(--acc-dim)] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-lg font-semibold">Gostou? Tenha acesso às {totalFerramentas} ferramentas por {preco}.</p>
            <Cta href={CHECKOUT} texto={`Quero as ${totalFerramentas} ferramentas`} />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <div className="text-center">
            <Kicker>{totalFerramentas} ferramentas · {modulos.length} módulos</Kicker>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Ferramentas para diferentes <Em>momentos das suas vendas.</Em></h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { t: "Atrair clientes", d: "Pesquisas de público, anúncios e campanhas.", i: "megaphone" },
              { t: "Criar ofertas", d: "Argumentos, benefícios e apresentações comerciais.", i: "gift" },
              { t: "Melhorar o atendimento", d: "Qualificação, abordagens e comunicação.", i: "headset" },
              { t: "Fechar vendas", d: "Negociação, objeções e follow-up.", i: "handshake" },
              { t: "Gerar recompra", d: "Pós-venda, indicações e reativação.", i: "repeat" },
              { t: "Organizar o comercial", d: "Metas, diagnósticos e planejamento.", i: "bar-chart" },
            ].map(b => (
              <div key={b.t} className={`${cartao} p-6`}>
                <span className="w-11 h-11 rounded-xl bg-[var(--acc-dim)] text-[var(--acc-bright)] flex items-center justify-center"><CentralIcone nome={b.i} size={20} /></span>
                <h3 className="mt-4 text-lg font-semibold">{b.t}</h3>
                <p className="mt-1 text-[var(--body)]">{b.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {modulos.map(m => (
              <span key={m.id} className="rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-xs text-[var(--body)]">{m.nome} · {m.ferramentas.length}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Plano de 7 dias */}
      {plano.some(d => d.ferramentas.length > 0) && (
        <section className="border-t border-[var(--line)]">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-20 md:py-28">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Não sabe por onde começar? <Em>Nós mostramos o caminho.</Em></h2>
              <p className="mt-4 text-lg text-[var(--body)]">Um roteiro de sete dias para começar a utilizar IA em tarefas reais do seu comercial.</p>
            </div>
            <ol className="mt-12 relative border-l border-[var(--line-strong)] ml-4 space-y-7">
              {plano.map(d => (
                <li key={d.dia} className="pl-8 relative">
                  <span className="absolute -left-[1.15rem] top-0 w-9 h-9 rounded-full border border-[var(--acc)] bg-[var(--canvas)] text-[var(--acc)] flex items-center justify-center font-[family-name:var(--f-mono)] text-xs">{d.dia}</span>
                  <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.18em] uppercase text-[var(--muted)]">Dia {d.dia}</p>
                  <h3 className="text-lg font-semibold mt-0.5">{d.titulo}</h3>
                  {d.ferramentas.length > 0 && (
                    <p className="mt-1 text-sm text-[var(--body)]">Ferramentas: {d.ferramentas.map(f => f.nome).join(" · ")}</p>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-10 text-center text-sm text-[var(--muted)]">O plano fica na sua área e marca cada dia concluído conforme você usa as ferramentas. Ele orienta a execução — não é garantia de vendas em sete dias.</p>
          </div>
        </section>
      )}

      {/* Oferta completa */}
      <section id="oferta" className="border-t border-[var(--line)] relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,.10),transparent)]" />
        <div className="relative max-w-2xl mx-auto px-4 md:px-6 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Tudo o que você precisa para começar a <Em>aplicar IA nas suas vendas.</Em></h2>
          <div className={`${cartao} mt-10 p-7 md:p-10 border-[rgba(251,191,36,.3)]`}>
            <ul className="space-y-2.5 text-left text-[var(--body)] max-w-sm mx-auto">
              {[
                `Acesso às ${totalFerramentas} ferramentas comerciais`,
                `${modulos.length} módulos especializados`,
                "Formulários de personalização",
                ...(temContinuacao ? ["Prompts de continuação"] : []),
                "Uso no ChatGPT ou no Claude (você copia e cola)",
                "Biblioteca organizada com busca",
                "Histórico e favoritos",
                "Plano prático de aplicação de 7 dias",
              ].map(t => <li key={t} className="flex gap-2.5"><Check size={17} className="text-[var(--acc)] flex-shrink-0 mt-0.5" />{t}</li>)}
            </ul>
            <div className="mt-8 pt-8 border-t border-[var(--line)]">
              <p className="text-6xl md:text-7xl font-semibold tracking-[-0.04em] tabular-nums">{preco}</p>
              <p className="mt-2 text-[var(--body)]">Pagamento único. Sem mensalidade.</p>
              <p className="mt-3 text-sm text-[var(--muted)]">Acesso liberado após a confirmação do pagamento, sem data de expiração. O acesso só é encerrado em caso de reembolso ou estorno da compra.</p>
            </div>
            <div className="mt-8 flex justify-center"><Cta href={CHECKOUT} texto="QUERO COMEÇAR COM A VENDAS IA" grande /></div>
            <p className="mt-4 font-[family-name:var(--f-mono)] text-[11px] tracking-[0.12em] uppercase text-[var(--muted)]">Pix ou cartão · Compra segura</p>
            <p className="mt-4 text-xs text-[var(--muted)]">Os kits complementares (como o Analisador de Relatórios e o WhatsApp Vendedor) são vendidos separadamente e não fazem parte desta oferta.</p>
          </div>
        </div>
      </section>

      {/* Direito de arrependimento */}
      <section className="border-t border-[var(--line)]">
        <FaixaGarantia />
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-[-0.025em]">Você tem <Em>7 dias.</Em></h2>
          <p className="mt-5 text-lg text-[var(--body)] leading-relaxed">
            Pelo Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias depois do pagamento e receber o valor integral de volta.
          </p>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 md:py-28">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-center">Perguntas <Em>frequentes.</Em></h2>
          <Faq
            itens={[
              ["Preciso saber criar prompts?", "Não. Você escolhe a ferramenta e responde perguntas simples sobre o seu negócio. A Vendas IA monta o prompt completo e estruturado para você copiar."],
              ["Preciso pagar o ChatGPT ou o Claude?", "Não é obrigatório: os prompts funcionam nas versões gratuitas das duas IAs. Algumas funções dessas plataformas, como limites maiores de uso ou análise de arquivos, podem exigir um plano pago delas — isso é cobrado pela OpenAI ou pela Anthropic, não pela Vendas IA."],
              ["A Vendas IA gera respostas automaticamente?", "Não. A Vendas IA prepara o comando com as suas informações. Você copia, cola no ChatGPT ou no Claude, e é lá que a resposta é gerada. Nada é enviado automaticamente para essas IAs."],
              ["Funciona para qualquer segmento comercial?", "As ferramentas foram pensadas para pequenos e médios negócios que vendem produtos ou serviços — loja, prestação de serviço, saúde, indústria, venda para empresas. As respostas que você dá no formulário é que adaptam o prompt ao seu caso."],
              ["O acesso exige mensalidade?", `Não. É um pagamento único de ${preco}, sem mensalidade da Vendas IA.`],
              ["Os produtos complementares estão incluídos?", "Não. Esta oferta inclui os 100 prompts comerciais. Kits complementares, como o Analisador de Relatórios de Vendas e o WhatsApp Vendedor, são vendidos à parte e podem aparecer como opção no checkout."],
              ["Como recebo o acesso depois da compra?", "Assim que o pagamento é confirmado — no cartão, na hora; no Pix, logo após o pagamento — sua conta é criada e você recebe um e-mail para definir sua senha e entrar."],
              ["Existe política de reembolso?", "Sim. Você pode desistir da compra em até 7 dias após o pagamento e receber o valor integral, conforme o art. 49 do Código de Defesa do Consumidor."],
              ["O produto garante aumento de vendas?", "Não. A Vendas IA entrega ferramentas e um método para usar a inteligência artificial nas suas tarefas comerciais. O resultado depende do seu negócio, da sua oferta e de como você aplica o que for gerado."],
            ]}
          />
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <Cta href={CHECKOUT} texto={ctaPrincipal.toUpperCase()} grande />
            <p className="text-sm text-[var(--muted)]">{preco} — pagamento único</p>
          </div>
        </div>
      </section>

      <Rodape />
      <BotaoFixoCelular href={CHECKOUT} texto={`Quero as ${totalFerramentas} ferramentas · ${preco}`} />
    </Pagina>
  );
}
