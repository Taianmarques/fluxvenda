import { prisma } from "@/lib/prisma";
import { anthropic, MODEL as CLAUDE_MODEL } from "@/lib/anthropic";
import { openai, MODEL as OPENAI_MODEL } from "@/lib/openai";
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

const SISTEMA_BASE = [
  "Você é um consultor comercial sênior que ajuda pequenos e médios empresários brasileiros a vender mais.",
  "Entregue o resultado pronto para usar, sem explicar o que vai fazer e sem repetir a pergunta.",
  "Escreva em português do Brasil, com linguagem simples e direta, adequada ao negócio descrito.",
  "Use o contexto da empresa para personalizar tudo. Quando faltar uma informação, faça a suposição mais razoável e siga — não pergunte de volta.",
  "Nunca invente números exatos, estatísticas, depoimentos ou nomes de clientes reais.",
  "Formate com markdown simples: títulos com ##, listas com - , **negrito** para destaques e tabelas markdown (| col | col |) quando a tarefa pedir tabela, matriz ou quadro.",
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

  // Claude quando houver chave; senão OpenAI (a VPS hoje só tem a da OpenAI)
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }],
    });
    const texto = res.content.filter(c => c.type === "text").map(c => (c.type === "text" ? c.text : "")).join("").trim();
    return { texto, provider: "anthropic" as const, model: CLAUDE_MODEL, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  }
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL, max_tokens: 4000, temperature: 0.7,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const texto = (res.choices[0]?.message?.content ?? "").trim();
  return { texto, provider: "openai" as const, model: OPENAI_MODEL, inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 };
}
