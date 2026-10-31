import { cartao, Em, Kicker } from "../_ui";

// Cases de empresas reais que usam as ferramentas comerciais (textos aprovados pelo cliente).
// O primeiro é o destaque, com número; os outros descrevem o uso, sem prometer resultado.

const DESTAQUE = {
  empresa: "Ponto dos Lençóis",
  categoria: "Oferta e campanha",
  numero: "80%",
  numeroLegenda: "do faturamento de janeiro de 2026",
  titulo: "Um único produto. Uma oferta bem construída. 80% do faturamento do mês.",
  texto: "O Ponto dos Lençóis utilizou ferramentas comerciais para transformar uma toalha infantil de volta às aulas em uma oferta específica e desenvolver sua campanha de divulgação. As vendas associadas à campanha representaram 80% do faturamento da empresa em janeiro de 2026.",
};

const OUTROS = [
  {
    empresa: "Série A Veículos",
    categoria: "Anúncios e acompanhamento de leads",
    titulo: "Do anúncio ao acompanhamento do cliente.",
    texto: "A Série A Veículos utiliza ferramentas comerciais para criar roteiros de vídeos, desenvolver anúncios e organizar fluxos de cadência para acompanhamento dos leads durante o processo de vendas.",
  },
  {
    empresa: "Distribuidora Pegue Pague",
    categoria: "Organização e estruturação comercial",
    titulo: "Ferramentas para colocar o comercial em ordem.",
    texto: "A Distribuidora Pegue Pague utilizou diferentes ferramentas para apoiar a estruturação de sua operação comercial, organizar processos e orientar ações de vendas.",
  },
  {
    empresa: "Domus Projetados",
    categoria: "Campanhas, ofertas e anúncios",
    titulo: "Campanhas, ofertas e anúncios com método.",
    texto: "A Domus Projetados utiliza ferramentas comerciais para criar suas campanhas, desenvolver ofertas e produzir seus anúncios.",
  },
];

export function Cases() {
  return (
    <section className="border-t border-[var(--line)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <Kicker>Cases</Kicker>
          <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.1]">Não é só teoria. <Em>Veja como essas ferramentas já foram utilizadas por empresas reais.</Em></h2>
        </div>

        <div className={`${cartao} mt-12 p-6 md:p-10 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center border-[rgba(251,191,36,.35)] bg-[linear-gradient(160deg,rgba(251,191,36,.08),rgba(255,255,255,.01))]`}>
          <div className="md:pr-10 md:border-r border-[var(--line)]">
            <p className="text-7xl md:text-8xl font-semibold tracking-[-0.05em] text-[var(--acc-bright)] tabular-nums">{DESTAQUE.numero}</p>
            <p className="mt-1 text-sm text-[var(--body)] max-w-[14rem]">{DESTAQUE.numeroLegenda}</p>
          </div>
          <div>
            <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">{DESTAQUE.empresa} · {DESTAQUE.categoria}</p>
            <h3 className="mt-3 text-2xl md:text-3xl font-semibold leading-snug">{DESTAQUE.titulo}</h3>
            <p className="mt-3 text-[var(--body)] leading-relaxed">{DESTAQUE.texto}</p>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {OUTROS.map(c => (
            <div key={c.empresa} className={`${cartao} p-6 flex flex-col`}>
              <p className="font-[family-name:var(--f-mono)] text-[11px] tracking-[0.16em] uppercase text-[var(--acc)]">{c.empresa}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{c.categoria}</p>
              <h3 className="mt-4 text-xl font-semibold leading-snug">{c.titulo}</h3>
              <p className="mt-2 text-[var(--body)] leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--muted)] max-w-2xl mx-auto">
          Os resultados de cada empresa dependem do seu mercado, da sua oferta e da sua execução. Os cases mostram como as ferramentas foram aplicadas e não são garantia de resultado.
        </p>
      </div>
    </section>
  );
}
