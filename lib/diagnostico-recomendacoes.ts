import { prisma } from "@/lib/prisma";
import { produtosLiberados } from "@/lib/infoprodutos";

// "Por onde começar": liga as áreas fracas do Diagnóstico Comercial (Scanner) às ferramentas da
// biblioteca. Sem IA — regra fixa: área com menor nota primeiro, e pra cada área os módulos que
// atacam aquele problema (em ordem de prioridade). Módulo que não existir no banco é ignorado.

type TipoDiagnostico = "EMPRESA" | "VENDEDOR";
type AreaKey = "leads" | "process" | "team" | "kpis" | "tools" | "value" | "retention" | "money";

type AreaDef = { label: string; porQue: string; modulos: string[] };

const AREAS: Record<TipoDiagnostico, Partial<Record<AreaKey, AreaDef>>> = {
  EMPRESA: {
    leads: { label: "Geração de Leads", porQue: "Atrair mais clientes interessados todo mês.", modulos: ["anuncios-e-aquisicao", "anuncios-meta", "conteudo-e-whatsapp", "whatsapp-abordagem", "anuncios-google"] },
    process: { label: "Processo de Vendas", porQue: "Conduzir cada lead do primeiro contato ao fechamento sem perder ninguém no caminho.", modulos: ["atendimento-e-qualificacao", "follow-up-e-fechamento", "whatsapp-qualificacao", "whatsapp-orcamentos", "whatsapp-fechamento"] },
    team: { label: "Equipe", porQue: "Dar metas, rotina e acompanhamento claros para o time.", modulos: ["gestao-comercial", "analisador-equipe-acao", "planejamento-comercial"] },
    kpis: { label: "KPIs & Dados", porQue: "Entender os números de vendas e decidir com base neles.", modulos: ["analisador-visao-geral", "gestao-comercial", "analisador-produtos"] },
    tools: { label: "Ferramentas", porQue: "Organizar a rotina comercial e não deixar contato esfriar.", modulos: ["planejamento-comercial", "whatsapp-follow-up", "gestao-comercial"] },
    value: { label: "Proposta de Valor", porQue: "Deixar claro por que comprar de você — e não do concorrente.", modulos: ["conheca-seu-cliente", "criacao-de-ofertas", "anuncios-copies"] },
    retention: { label: "Retenção", porQue: "Fazer o cliente voltar a comprar e indicar.", modulos: ["pos-venda-e-recompra", "whatsapp-pos-venda", "analisador-clientes"] },
    money: { label: "Dinheiro na Mesa", porQue: "Recuperar receita parada: clientes inativos, upsell e descontos à toa.", modulos: ["pos-venda-e-recompra", "analisador-clientes", "negociacao-e-objecoes", "criacao-de-ofertas"] },
  },
  VENDEDOR: {
    leads: { label: "Prospecção Ativa", porQue: "Abrir mais conversas com clientes em potencial.", modulos: ["whatsapp-abordagem", "conteudo-e-whatsapp", "anuncios-e-aquisicao"] },
    process: { label: "Qualificação", porQue: "Descobrir rápido quem está pronto para comprar.", modulos: ["atendimento-e-qualificacao", "whatsapp-qualificacao"] },
    team: { label: "Negociação & Objeções", porQue: "Responder \"tá caro\" e \"vou pensar\" sem dar desconto à toa.", modulos: ["negociacao-e-objecoes", "whatsapp-objecoes", "whatsapp-negociacao"] },
    kpis: { label: "Fechamento & Follow-up", porQue: "Retomar propostas paradas e pedir a decisão na hora certa.", modulos: ["follow-up-e-fechamento", "whatsapp-follow-up", "whatsapp-fechamento"] },
    tools: { label: "Ferramentas & Organização", porQue: "Ter uma rotina de vendas organizada.", modulos: ["planejamento-comercial", "whatsapp-follow-up"] },
    value: { label: "Pitch & Proposta", porQue: "Apresentar o valor do que você vende com clareza.", modulos: ["criacao-de-ofertas", "conheca-seu-cliente", "whatsapp-orcamentos"] },
    retention: { label: "Desenvolvimento Contínuo", porQue: "Evoluir como vendedor com método.", modulos: ["conheca-seu-cliente", "negociacao-e-objecoes", "planejamento-comercial"] },
  },
};

export type DiagnosticoScores = {
  diagnosticType: string;
  scoreLeads: number; scoreProcess: number; scoreTeam: number; scoreKpis: number;
  scoreTools: number; scoreValue: number; scoreRetention: number; scoreMoney: number;
};

export type FerramentaRecomendada = {
  slug: string; nome: string; descricao: string; icone: string; moduloId: string;
  produtoSlug: string; produtoNome: string; liberado: boolean;
};
export type AreaRecomendada = { key: string; label: string; score: number; porQue: string; ferramentas: FerramentaRecomendada[] };

const MAX_AREAS = 3;
const POR_AREA = 3;

function notas(d: DiagnosticoScores): Record<AreaKey, number> {
  return {
    leads: d.scoreLeads, process: d.scoreProcess, team: d.scoreTeam, kpis: d.scoreKpis,
    tools: d.scoreTools, value: d.scoreValue, retention: d.scoreRetention, money: d.scoreMoney,
  };
}

export async function recomendarFerramentas(userId: string, d: DiagnosticoScores): Promise<AreaRecomendada[]> {
  const defs = AREAS[d.diagnosticType === "VENDEDOR" ? "VENDEDOR" : "EMPRESA"];
  const n = notas(d);

  // Áreas abaixo de 70 (crítico/atenção), da pior pra melhor; se está tudo bom, as 2 mais baixas
  const ordenadas = (Object.keys(defs) as AreaKey[]).sort((a, b) => n[a] - n[b]);
  const fracas = ordenadas.filter(k => n[k] < 70);
  const escolhidas = (fracas.length ? fracas : ordenadas.slice(0, 2)).slice(0, MAX_AREAS);

  const modulos = [...new Set(escolhidas.flatMap(k => defs[k]!.modulos))];
  const [liberados, ferramentas] = await Promise.all([
    produtosLiberados(userId),
    prisma.centralFerramenta.findMany({
      where: { publicada: true, moduloId: { in: modulos } },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: {
        slug: true, nome: true, descricao: true, icone: true, moduloId: true,
        modulo: { select: { produto: { select: { id: true, slug: true, nome: true, publicado: true } } } },
      },
    }),
  ]);

  // Rascunho de produto só conta pra quem já tem acesso a ele (admin)
  const porModulo = new Map<string, FerramentaRecomendada[]>();
  for (const f of ferramentas) {
    const p = f.modulo.produto;
    const liberado = liberados.has(p.id);
    if (!p.publicado && !liberado) continue;
    const lista = porModulo.get(f.moduloId) ?? [];
    lista.push({ slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone, moduloId: f.moduloId, produtoSlug: p.slug, produtoNome: p.nome, liberado });
    porModulo.set(f.moduloId, lista);
  }

  const usadas = new Set<string>();
  return escolhidas.map(k => {
    const def = defs[k]!;
    // Uma ferramenta por módulo, em rodadas (variedade); depois as que a pessoa já tem vêm primeiro
    const filas = def.modulos.map(m => (porModulo.get(m) ?? []).filter(f => !usadas.has(f.slug)));
    const candidatas: FerramentaRecomendada[] = [];
    for (let i = 0; candidatas.length < POR_AREA * 3 && filas.some(q => q.length > i); i++) {
      for (const q of filas) if (q[i]) candidatas.push(q[i]);
    }
    const escolha = [...candidatas.filter(f => f.liberado), ...candidatas.filter(f => !f.liberado)].slice(0, POR_AREA);
    escolha.forEach(f => usadas.add(f.slug));
    return { key: k, label: def.label, score: n[k], porQue: def.porQue, ferramentas: escolha };
  }).filter(a => a.ferramentas.length > 0);
}

// Diagnóstico mais recente que a pessoa vê (o próprio; vendedor sem diagnóstico vê o do gestor)
export async function ultimoDiagnostico(userId: string) {
  const proprio = await prisma.diagnostic.findFirst({ where: { profileId: userId }, orderBy: { createdAt: "desc" } });
  if (proprio) return proprio;
  const membro = await prisma.teamMember.findUnique({ where: { profileId: userId }, select: { team: { select: { managerId: true } } } });
  const gestor = membro?.team?.managerId;
  return gestor ? prisma.diagnostic.findFirst({ where: { profileId: gestor }, orderBy: { createdAt: "desc" } }) : null;
}
