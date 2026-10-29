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
  "- Cada item entregue (cada mensagem, anúncio, roteiro, persona, etapa do plano) começa com o próprio título \"## \" (ex.: \"## Resposta 1 — quando ele compara com o posto\"), para a pessoa copiar um por um. A hipótese assumida, se houver, vem antes do primeiro título, em uma linha.",
].join("\n");

// Regras de qualidade pro prompt copiado (ChatGPT/Claude do próprio usuário) — as mesmas da
// geração na plataforma, menos o "não pergunte de volta": lá existe conversa, então perguntar é ok
const REGRAS_COPIA = [
  "- Use os dados concretos da minha empresa em todo o texto (nome, produto, preço, região, público, diferenciais). Uma resposta que serviria para qualquer empresa não me ajuda.",
  "- Escreva o material completo, pronto para copiar e usar: mensagens inteiras, roteiros com as falas, tabelas preenchidas. Nada de \"algo como...\" ou lacunas para eu completar.",
  "- Entregue exatamente as quantidades pedidas, cada item diferente dos outros.",
  "- Troque conselho genérico por ações concretas: o que fazer, onde, com que texto e como medir.",
  "- Para cada item entregue, diga em uma linha quando usar.",
  "- Feche com uma ação que eu consiga fazer em 15 minutos, com o passo a passo.",
  "- Português do Brasil, linguagem simples, sem introdução nem conclusão motivacional.",
].join("\n");

// Na plataforma a regra das perguntas foi trocada por "assuma hipóteses"; no prompt copiado volta a original
const REGRA_PERGUNTAS_PLATAFORMA = /Se alguma informação essencial estiver ausente, não pergunte de volta:[^.]*\./;
const REGRA_PERGUNTAS_ORIGINAL = "Se alguma informação essencial estiver ausente, faça no máximo três perguntas objetivas antes de entregar.";

// Ajuste de um resultado já gerado: a IA recebe a tarefa original, o material atual e o pedido do
// usuário, e devolve o material inteiro com SÓ aquilo alterado — o resto (estrutura, títulos ##,
// textos que não foram citados) fica igual, pra pessoa não perder o que já estava bom.
export async function ajustarResultado(params: {
  prompt: string;
  entradas: Record<string, string>;
  perfil: PerfilEmpresaDados;
  campos: CampoFerramenta[];
  resultadoAtual: string;
  pedido: string;
}) {
  const contexto = perfilComoTexto(params.perfil);
  const system = [
    SISTEMA_BASE,
    contexto ? `\nContexto da empresa do usuário:\n${contexto}` : "",
    "\nVOCÊ ESTÁ AJUSTANDO UM MATERIAL QUE JÁ FOI ENTREGUE:",
    "- Aplique exatamente o ajuste pedido, em todos os pontos do material onde ele se aplica (ex.: se o preço mudou, troque o preço em todas as mensagens).",
    "- Se o pedido tiver mais de uma correção (ex.: \"o preço é R$ 200 e só parcelamos em 3x\"), aplique CADA uma delas — confira item por item antes de devolver. Informação nova do usuário (condição de pagamento, prazo, garantia) deve aparecer nos itens onde faz sentido mencioná-la.",
    "- Mantenha todo o resto como está: mesma estrutura, mesmos títulos ##, mesma quantidade de itens e os textos que o ajuste não afeta.",
    "- Correções de informação feitas pelo usuário (preço, nome, prazo, condição) passam a valer como fato — use exatamente como ele escreveu.",
    "- Devolva o material completo já ajustado, sem comentar o que mudou e sem introdução.",
  ].join("\n");
  const user = [
    `TAREFA ORIGINAL:\n${montarPrompt(params.prompt, params.entradas, params.perfil, params.campos)}`,
    `MATERIAL ATUAL:\n${params.resultadoAtual}`,
    `AJUSTE PEDIDO:\n${params.pedido}`,
  ].join("\n\n");

  const res = await openai.chat.completions.create({
    model: CENTRAL_MODEL, max_tokens: 8000, temperature: 0.4,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const texto = (res.choices[0]?.message?.content ?? "").trim();
  return { texto, provider: "openai" as const, model: CENTRAL_MODEL, inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
}

// O formato esperado só entra à parte quando o prompt ainda não traz o mesmo texto (as 100 ferramentas
// do material já têm o "ENTREGUE" dentro do prompt — não precisa repetir)
function formatoExtra(prompt: string, formato?: string) {
  const f = formato?.trim();
  return Boolean(f) && !prompt.includes(f!);
}

// Quem pode usar a ferramenta e quanto ainda pode usar hoje (limite por usuário por dia)
export async function verificarUsoFerramenta(userId: string, f: { id: string; acesso: string; limiteDiario: number | null }) {
  if (f.acesso === "gestores") {
    const p = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    if (p?.role !== "GESTOR" && p?.role !== "ADMIN") {
      return { permitido: false as const, motivo: "Esta ferramenta é exclusiva para gestores.", usosHoje: 0, limite: f.limiteDiario };
    }
  }
  let usosHoje = 0;
  if (f.limiteDiario) {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    usosHoje = await prisma.centralGeracao.count({ where: { profileId: userId, ferramentaId: f.id, createdAt: { gte: inicioDia } } });
    if (usosHoje >= f.limiteDiario) {
      return { permitido: false as const, motivo: `Você já usou esta ferramenta ${f.limiteDiario} ${f.limiteDiario === 1 ? "vez" : "vezes"} hoje, que é o limite diário. Volte amanhã!`, usosHoje, limite: f.limiteDiario };
    }
  }
  return { permitido: true as const, motivo: null, usosHoje, limite: f.limiteDiario };
}

export function montarPromptParaCopiar(params: {
  prompt: string;
  instrucoes: string;
  formatoResposta?: string;
  entradas: Record<string, string>;
  perfil: PerfilEmpresaDados;
  campos: CampoFerramenta[];
}) {
  const contexto = perfilComoTexto(params.perfil);
  const regras = params.instrucoes.trim().replace(REGRA_PERGUNTAS_PLATAFORMA, REGRA_PERGUNTAS_ORIGINAL);
  // No ChatGPT a IA pode perguntar o que faltar — campo vazio fica só "(não informado)"
  const prompt = montarPrompt(params.prompt, params.entradas, params.perfil, params.campos).replace(/\(não informado — [^)]*\)/g, "(não informado)");
  return [
    prompt,
    contexto ? `SOBRE A MINHA EMPRESA:\n${contexto}` : "",
    formatoExtra(params.prompt, params.formatoResposta) ? `ENTREGUE:\n${params.formatoResposta!.trim()}` : "",
    regras ? `REGRAS: ${regras}` : "",
    `COMO QUERO A RESPOSTA:\n${REGRAS_COPIA}`,
  ].filter(Boolean).join("\n\n");
}

export async function gerarComFerramenta(params: {
  prompt: string;
  instrucoes: string;
  formatoResposta?: string;
  entradas: Record<string, string>;
  perfil: PerfilEmpresaDados;
  campos: CampoFerramenta[];
}) {
  const contexto = perfilComoTexto(params.perfil);
  const system = [
    SISTEMA_BASE,
    contexto ? `\nContexto da empresa do usuário:\n${contexto}` : "",
    params.instrucoes.trim() ? `\nInstruções de resposta desta ferramenta:\n${params.instrucoes.trim()}` : "",
    formatoExtra(params.prompt, params.formatoResposta) ? `\nFormato esperado da resposta:\n${params.formatoResposta!.trim()}` : "",
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
