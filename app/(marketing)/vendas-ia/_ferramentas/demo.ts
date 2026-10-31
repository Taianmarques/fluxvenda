import { prisma } from "@/lib/prisma";
import { lerCampos } from "@/lib/central";
import { montarPromptFinal } from "@/lib/central-prompt";

// Exemplo da animação do topo das landings: o prompt é montado de verdade com a ferramenta de
// anúncio de exemplo (demo-criar-anuncio, mesmo montador da biblioteca) e estes dados

const DEMO_SLUG = "demo-criar-anuncio";
export const DEMO_NOME = "Criador de Anúncios que Atraem Clientes";
const DEMO_EXEMPLO: Record<string, string> = {
  segmento: "Estética automotiva",
  produto: "Lavagem completa com higienização interna",
  publico: "Donos de carro de 30 a 55 anos que usam o carro para trabalhar",
  beneficio: "Carro com cheiro de novo em 3 horas, com busca e entrega",
  objetivo: "Receber mensagens no WhatsApp",
};
// Resposta ilustrativa (a plataforma não executa IA; a animação deixa isso escrito)
export const DEMO_RESPOSTA = [
  "Anúncio 1 · ângulo dor\nGancho: Entrar no carro e sentir cheiro de lanche de ontem?\nTexto: Lavagem completa com higienização interna. Em 3 horas, com busca e entrega onde você estiver.\nChamada: Chamar no WhatsApp",
  "Anúncio 2 · ângulo benefício\nGancho: Cheiro de carro novo sem sair do trabalho.",
];

// Campos preenchidos (rótulo → valor) e prompt final da ferramenta de exemplo; null se ela não existir
export async function carregarDemoAnuncio() {
  const demo = await prisma.centralFerramenta.findUnique({
    where: { slug: DEMO_SLUG },
    select: { prompt: true, instrucoes: true, formatoResposta: true, campos: true, modulo: { select: { produto: { select: { regrasQualidade: true } } } } },
  });
  if (!demo) return null;
  const campos = lerCampos(demo.campos);
  const prompt = montarPromptFinal({
    prompt: demo.prompt, instrucoes: demo.instrucoes, formatoResposta: demo.formatoResposta, entradas: DEMO_EXEMPLO,
    perfil: null, campos, regrasQualidade: demo.modulo.produto.regrasQualidade,
  });
  return { campos: campos.map(c => [c.label, DEMO_EXEMPLO[c.key] ?? ""] as [string, string]), prompt };
}
