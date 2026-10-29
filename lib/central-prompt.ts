import { montarPrompt, perfilComoTexto, type CampoFerramenta, type PerfilEmpresaDados } from "@/lib/central-shared";

// Monta o prompt final de uma ferramenta da Central — o que o usuário copia e cola no ChatGPT ou
// Claude. Não chama nenhuma IA: é só o template oficial (os 100 prompts do material) preenchido
// com o formulário e o perfil da empresa, mais as regras de qualidade. Sem banco, sem rede.
//
// Ordem do prompt:
//   1. o prompt oficial da ferramenta, com os campos preenchidos
//   2. SOBRE A MINHA EMPRESA — o perfil cadastrado (o que estiver preenchido)
//   3. ENTREGUE — só quando o formato não está dentro do prompt (ferramentas criadas no admin)
//   4. REGRAS — as regras do material, como estão
//   5. COMO QUERO A RESPOSTA — regras contra resposta vaga

// Regras de qualidade acrescentadas a todo prompt: pedem que a IA use os dados reais do negócio e
// entregue o material inteiro, pronto pra usar
export const REGRAS_QUALIDADE = [
  "- Use os dados concretos da minha empresa em todo o texto (nome, produto, preço, região, público, diferenciais). Uma resposta que serviria para qualquer empresa não me ajuda.",
  "- Escreva o material completo, pronto para copiar e usar: mensagens inteiras, roteiros com as falas, tabelas preenchidas. Nada de \"algo como...\" ou lacunas para eu completar.",
  "- Entregue exatamente as quantidades pedidas, cada item diferente dos outros.",
  "- Troque conselho genérico por ações concretas: o que fazer, onde, com que texto e como medir.",
  "- Para cada item entregue, diga em uma linha quando usar.",
  "- Português do Brasil, linguagem simples, sem introdução nem conclusão motivacional.",
].join("\n");

// Versões antigas da Central trocavam a regra das perguntas (lá a IA rodava sem conversa). No
// prompt pro ChatGPT/Claude vale a regra original do material — por garantia, desfaz a troca.
const REGRA_PERGUNTAS_ADAPTADA = /Se alguma informação essencial estiver ausente, não pergunte de volta:[^.]*\./;
const REGRA_PERGUNTAS_ORIGINAL = "Se alguma informação essencial estiver ausente, faça no máximo três perguntas objetivas antes de entregar.";

// O formato esperado só entra à parte quando o prompt ainda não traz o mesmo texto (as 100
// ferramentas do material já têm o "ENTREGUE" dentro do prompt — não precisa repetir)
function formatoExtra(prompt: string, formato?: string) {
  const f = formato?.trim();
  return f && !prompt.includes(f) ? f : "";
}

export function montarPromptFinal(params: {
  prompt: string;
  instrucoes: string;
  formatoResposta?: string;
  entradas: Record<string, string>;
  perfil: Partial<PerfilEmpresaDados> | null;
  campos: CampoFerramenta[];
  regrasQualidade?: boolean; // false: o prompt já traz regras próprias completas (ex: Analisador)
}) {
  const contexto = perfilComoTexto(params.perfil);
  const regras = params.instrucoes.trim().replace(REGRA_PERGUNTAS_ADAPTADA, REGRA_PERGUNTAS_ORIGINAL);
  // Campo vazio vira "(não informado)" — a regra do material manda a IA perguntar o que faltar
  const corpo = montarPrompt(params.prompt, params.entradas, params.perfil, params.campos).replace(/\(não informado — [^)]*\)/g, "(não informado)");
  const formato = formatoExtra(params.prompt, params.formatoResposta);
  return [
    corpo,
    contexto ? `SOBRE A MINHA EMPRESA:\n${contexto}` : "",
    formato ? `ENTREGUE:\n${formato}` : "",
    regras ? `REGRAS: ${regras}` : "",
    params.regrasQualidade === false ? "" : `COMO QUERO A RESPOSTA:\n${REGRAS_QUALIDADE}`,
  ].filter(Boolean).join("\n\n").trim();
}

// Marcações que sobraram sem preencher — não deve acontecer; usado no teste e no admin
export function marcacoesSobrando(prompt: string) {
  return [...prompt.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)].map(m => m[1]);
}
