import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getTeamIdForUser } from "@/lib/token-usage";
import { getEffectiveProducts, hasProduct } from "@/lib/products";
import { PERFIL_CAMPOS, PERFIL_VAZIO, montarPrompt, perfilComoTexto, type CampoFerramenta, type PerfilEmpresaDados } from "@/lib/central-shared";

// Central de Ferramentas Comerciais — acesso, perfil da empresa e geração com IA (servidor).

export async function podeUsarCentral(userId: string) {
  return hasProduct(await getEffectiveProducts(userId), "PLATAFORMA");
}

// Perfil da empresa é da equipe; quem não tem equipe tem um perfil próprio
export async function donoDoPerfil(userId: string) {
  const teamId = await getTeamIdForUser(userId);
  return teamId ? { teamId } : { profileId: userId };
}

export async function carregarPerfil(userId: string): Promise<PerfilEmpresaDados> {
  const dono = await donoDoPerfil(userId);
  const row = await prisma.perfilEmpresa.findUnique({ where: dono as { teamId: string } | { profileId: string } });
  if (!row) return { ...PERFIL_VAZIO };
  return Object.fromEntries(PERFIL_CAMPOS.map(c => [c.key, row[c.key] ?? ""])) as PerfilEmpresaDados;
}

export async function salvarPerfil(userId: string, dados: PerfilEmpresaDados) {
  const dono = await donoDoPerfil(userId);
  return prisma.perfilEmpresa.upsert({
    where: dono as { teamId: string } | { profileId: string },
    create: { ...dono, ...dados },
    update: dados,
  });
}

export function lerCampos(json: unknown): CampoFerramenta[] {
  return Array.isArray(json) ? (json as CampoFerramenta[]) : [];
}

// Modelo da Central (escolha do produto: gpt-4.1-mini — mais específico que o 4o-mini, custo baixo)
const CENTRAL_MODEL = "gpt-4.1-mini";

// Vale pra todas as ferramentas, por cima do prompt de cada uma. O foco é evitar resposta vaga:
// usar os dados reais do negócio e entregar o material escrito por inteiro, pronto pra copiar.
const SISTEMA_BASE = [
  "Você é um consultor comercial sênior que trabalha DENTRO do negócio do usuário — pequenos e médios empresários brasileiros. Seu trabalho é entregar material pronto para usar hoje, não teoria.",
  "",
  "SEJA ESPECÍFICO (regra mais importante):",
  "- Use os dados concretos do contexto em todo o texto: o nome da empresa, o produto/serviço pelo nome, o preço, a cidade/região, o público, os diferenciais. Uma resposta que serviria para qualquer empresa está errada.",
  "- Escreva o material completo, palavra por palavra: mensagens de WhatsApp prontas para enviar, roteiros com as falas, anúncios com o texto final, tabelas preenchidas. Nunca escreva \"você pode dizer algo como...\", \"adapte ao seu negócio\", \"[inserir aqui]\" ou deixe lacunas para o usuário completar.",
  "- Entregue exatamente as quantidades pedidas (ex.: dez dores = dez itens distintos, cinco respostas = cinco textos completos). Cada item precisa ser diferente dos outros, sem variações da mesma ideia.",
  "- Troque conselho genérico (\"conheça seu público\", \"ofereça um bom atendimento\", \"use as redes sociais\") por ações concretas: o que fazer, onde, com que texto, em que dia, e como medir.",
  "- Exemplos devem ser situações reais do segmento do usuário (para uma estética automotiva: o cliente que chega com o carro cheio de pelo de cachorro; não \"um cliente qualquer\").",
  "",
  "HONESTIDADE:",
  "- Nunca invente números, estatísticas, depoimentos, nomes de clientes, descontos ou prazos. Quando um número for necessário e não foi informado, use um exemplo claramente marcado como hipótese (\"exemplo: R$ 150 — ajuste ao seu preço\") e diga como confirmar.",
  "- Quando faltar informação, não pergunte de volta: assuma a hipótese mais provável para esse segmento, diga em uma linha no início qual hipótese assumiu, e siga com a entrega completa.",
  "",
  "COMPLETUDE:",
  "- Cumpra TODAS as instruções de resposta da ferramenta, sem pular nenhuma: se pedirem etapas numeradas, exemplos, como validar hipóteses ou uma ação final de 15 minutos, cada uma precisa aparecer com título próprio.",
  "- Para cada item entregue (mensagem, anúncio, resposta), acrescente uma linha \"Quando usar:\" dizendo em que situação ele funciona melhor.",
  "- Feche com \"## Faça agora (15 minutos)\": uma única ação concreta, com o passo a passo e o texto pronto se envolver enviar algo.",
  "",
  "FORMATO:",
  "- Português do Brasil, linguagem simples e direta, frases curtas. Sem introdução, sem repetir a tarefa, sem conclusão motivacional.",
  "- Markdown simples: títulos com ##, listas com -, **negrito** para destaques e tabelas markdown (| col | col |) quando a tarefa pedir tabela, matriz, quadro ou planilha.",
].join("\n");

export async function gerarComFerramenta(params: {
  prompt: string;
  instrucoes: string;
  entradas: Record<string, string>;
  perfil: PerfilEmpresaDados;
  campos: CampoFerramenta[];
}) {
  const contexto = perfilComoTexto(params.perfil);
  const system = [
    SISTEMA_BASE,
    contexto ? `\nContexto da empresa do usuário:\n${contexto}` : "",
    params.instrucoes.trim() ? `\nInstruções de resposta desta ferramenta:\n${params.instrucoes.trim()}` : "",
  ].join("\n");
  const user = montarPrompt(params.prompt, params.entradas, params.perfil, params.campos);

  // Respostas longas (calendário de 30 dias, 20 atalhos...) precisam de espaço — 8k tokens de saída
  const res = await openai.chat.completions.create({
    model: CENTRAL_MODEL, max_tokens: 8000, temperature: 0.6,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const texto = (res.choices[0]?.message?.content ?? "").trim();
  return { texto, provider: "openai" as const, model: CENTRAL_MODEL, inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
}
