import { prisma } from "@/lib/prisma";

// Plano prático de 7 dias dos 100 prompts: um roteiro curto que liga cada dia a ferramentas reais
// da biblioteca. Não é curso: o dia fica concluído quando a pessoa prepara o prompt de todas as
// ferramentas do dia (o histórico já registra isso — sem tabela nova). Ferramenta que não existir
// ou não estiver publicada some do dia.

export const PRODUTO_PLANO_SLUG = "100-prompts-vendas";

export const PLANO_7_DIAS = [
  { dia: 1, titulo: "Identifique seu cliente ideal", porQue: "Tudo o que vem depois fica melhor quando você sabe para quem está vendendo.", ferramentas: ["identifique-seu-cliente-ideal", "descubra-as-principais-dores-do-publico"] },
  { dia: 2, titulo: "Melhore uma oferta comercial", porQue: "Uma oferta clara vende mais do que um desconto.", ferramentas: ["transforme-um-produto-comum-em-uma-oferta", "crie-argumentos-de-valor"] },
  { dia: 3, titulo: "Prepare uma campanha para atrair clientes", porQue: "Com o cliente e a oferta definidos, o anúncio sai certeiro.", ferramentas: ["crie-anuncios-para-meta-ads", "planeje-campanha-de-geracao-de-leads"] },
  { dia: 4, titulo: "Estruture sua abordagem de atendimento", porQue: "Responder rápido e com as perguntas certas separa curioso de comprador.", ferramentas: ["monte-roteiro-de-primeiro-atendimento", "crie-perguntas-de-qualificacao"] },
  { dia: 5, titulo: "Trabalhe respostas a objeções", porQue: "\"Tá caro\" e \"vou pensar\" têm resposta — e não precisa ser desconto.", ferramentas: ["responda-ao-cliente-que-achou-caro", "responda-ao-vou-pensar"] },
  { dia: 6, titulo: "Crie um processo de follow-up", porQue: "Boa parte das vendas acontece depois do segundo contato.", ferramentas: ["faca-follow-up-apos-orcamento", "monte-cinco-follow-ups"] },
  { dia: 7, titulo: "Monte um plano de ação comercial", porQue: "Junte o que você fez na semana num plano para os próximos 30 dias.", ferramentas: ["monte-plano-de-vendas-para-30-dias"] },
] as const;

export type FerramentaDoPlano = { slug: string; nome: string; descricao: string; icone: string; feita: boolean };
export type DiaDoPlano = { dia: number; titulo: string; porQue: string; ferramentas: FerramentaDoPlano[]; concluido: boolean };

// Dias do plano com as ferramentas reais; com userId, marca o que a pessoa já preparou
export async function carregarPlano7Dias(userId?: string): Promise<DiaDoPlano[]> {
  const slugs = PLANO_7_DIAS.flatMap(d => d.ferramentas as readonly string[]);
  const ferramentas = await prisma.centralFerramenta.findMany({
    where: { slug: { in: slugs }, publicada: true, modulo: { produto: { slug: PRODUTO_PLANO_SLUG } } },
    select: { id: true, slug: true, nome: true, descricao: true, icone: true },
  });
  const usadas = userId
    ? new Set((await prisma.centralGeracao.findMany({
        where: { profileId: userId, tipo: "prompt", ferramentaId: { in: ferramentas.map(f => f.id) } },
        distinct: ["ferramentaId"], select: { ferramentaId: true },
      })).map(g => g.ferramentaId))
    : new Set<string>();
  const porSlug = new Map(ferramentas.map(f => [f.slug, f]));

  return PLANO_7_DIAS.map(d => {
    const lista = (d.ferramentas as readonly string[]).flatMap(s => {
      const f = porSlug.get(s);
      return f ? [{ slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone, feita: usadas.has(f.id) }] : [];
    });
    return { dia: d.dia, titulo: d.titulo, porQue: d.porQue, ferramentas: lista, concluido: lista.length > 0 && lista.every(f => f.feita) };
  });
}
