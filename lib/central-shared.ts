// Central de Ferramentas Comerciais — tipos e regras usados no cliente e no servidor.
// Uma ferramenta tem um formulário (campos) e um prompt interno com marcações:
//   {{chave}}            → valor do campo do formulário com essa key
//   {{empresa.produtos}} → campo do perfil da empresa (ver PERFIL_CAMPOS)
//   {{empresa}}          → bloco com o perfil inteiro, já formatado
// O prompt nunca vai pro navegador (só quando a ferramenta permite "Copiar prompt").

export const CAMPO_TIPOS = ["texto", "textarea", "select", "numero"] as const;
export type CampoTipo = (typeof CAMPO_TIPOS)[number];

export type CampoFerramenta = {
  key: string;
  label: string;
  tipo: CampoTipo;
  placeholder?: string;
  ajuda?: string;
  opcoes?: string[]; // só pra "select"
  obrigatorio: boolean;
  // Campo do perfil da empresa que já preenche este (ex: "produtos") — o formulário chega
  // pré-preenchido e, se a pessoa apagar, o prompt usa o valor do perfil
  perfil?: PerfilKey;
};

export const PERFIL_CAMPOS = [
  { key: "nomeEmpresa", label: "Nome da empresa", placeholder: "Ex: Lava Rápido Brilho", tipo: "texto" },
  { key: "segmento", label: "Segmento", placeholder: "Ex: estética automotiva", tipo: "texto" },
  { key: "produtos", label: "O que você vende", placeholder: "Produtos/serviços principais e preços aproximados", tipo: "textarea" },
  { key: "publico", label: "Quem é o seu cliente", placeholder: "Ex: donos de carro de 30 a 55 anos, classe B, zona sul", tipo: "textarea" },
  { key: "ticketMedio", label: "Ticket médio", placeholder: "Ex: R$ 180", tipo: "texto" },
  { key: "diferenciais", label: "Diferenciais", placeholder: "Por que escolhem você e não o concorrente", tipo: "textarea" },
  { key: "regiao", label: "Cidade/região de atuação", placeholder: "Ex: Porto Alegre e região metropolitana", tipo: "texto" },
  { key: "canais", label: "Canais de venda", placeholder: "Ex: WhatsApp, Instagram, loja física", tipo: "texto" },
  { key: "tomDeVoz", label: "Tom de voz", placeholder: "Ex: próximo e descontraído, sem gírias", tipo: "texto" },
  { key: "concorrentes", label: "Principais concorrentes", placeholder: "Opcional", tipo: "texto" },
  { key: "observacoes", label: "Outras informações", placeholder: "Promoções, garantias, horários, o que mais a IA deve saber", tipo: "textarea" },
] as const;

export type PerfilKey = (typeof PERFIL_CAMPOS)[number]["key"];
export type PerfilEmpresaDados = Record<PerfilKey, string>;

export const PERFIL_VAZIO = Object.fromEntries(PERFIL_CAMPOS.map(c => [c.key, ""])) as PerfilEmpresaDados;

// Campos mínimos pra IA ter contexto do negócio — abaixo disso a tela sugere completar o perfil
export const PERFIL_ESSENCIAIS: PerfilKey[] = ["nomeEmpresa", "segmento", "produtos", "publico"];

export function perfilCompleto(p: Partial<PerfilEmpresaDados> | null | undefined) {
  if (!p) return 0;
  const preenchidos = PERFIL_CAMPOS.filter(c => (p[c.key] ?? "").trim()).length;
  return Math.round((preenchidos / PERFIL_CAMPOS.length) * 100);
}

export function perfilTemEssenciais(p: Partial<PerfilEmpresaDados> | null | undefined) {
  return Boolean(p) && PERFIL_ESSENCIAIS.every(k => (p?.[k] ?? "").trim());
}

export function perfilComoTexto(p: Partial<PerfilEmpresaDados> | null | undefined) {
  if (!p) return "";
  return PERFIL_CAMPOS
    .filter(c => (p[c.key] ?? "").trim())
    .map(c => `- ${c.label}: ${(p[c.key] ?? "").trim()}`)
    .join("\n");
}

// Substitui as marcações do prompt. Campo vazio vira "(não informado)" pra IA não inventar.
export function montarPrompt(prompt: string, entradas: Record<string, string>, perfil: Partial<PerfilEmpresaDados> | null, campos: CampoFerramenta[] = []) {
  return prompt.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, chave: string) => {
    if (chave === "empresa") return perfilComoTexto(perfil) || "(perfil da empresa não preenchido)";
    if (chave.startsWith("empresa.")) {
      const v = (perfil?.[chave.slice(8) as PerfilKey] ?? "").trim();
      return v || "(não informado)";
    }
    const campo = campos.find(c => c.key === chave);
    const v = (entradas[chave] ?? "").trim() || (campo?.perfil ? (perfil?.[campo.perfil] ?? "").trim() : "");
    return v || "(não informado)";
  });
}

// Marcações {{chave}} do prompt que não são do perfil — usadas no admin pra avisar de campo faltando
export function marcacoesDoPrompt(prompt: string) {
  const set = new Set<string>();
  for (const m of prompt.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)) {
    if (m[1] !== "empresa" && !m[1].startsWith("empresa.")) set.add(m[1]);
  }
  return [...set];
}

export function slugify(v: string) {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const MAX_CAMPO_VALOR = 3000;
