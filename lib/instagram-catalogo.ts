import { prisma } from "@/lib/prisma";
import { ensureStoreSlug } from "@/lib/store-slug";

// No Instagram a IA responde só com texto (sem as ferramentas do WhatsApp), então o catálogo
// entra direto no prompt. A placa é de uso interno e nunca vai para a IA.
const ORCAMENTO_CARACTERES = 12000;

const CAMBIO: Record<string, string> = { MANUAL: "câmbio manual", AUTOMATICO: "câmbio automático" };
const COMBUSTIVEL: Record<string, string> = { FLEX: "flex", GASOLINA: "gasolina", ETANOL: "etanol", DIESEL: "diesel", ELETRICO: "elétrico", HIBRIDO: "híbrido", GNV: "GNV" };

export type ItemCatalogo = {
  name: string;
  price: number;
  precoPromocional: number | null;
  modelo: string | null;
  anoFabricacao: number | null;
  anoModelo: number | null;
  km: number | null;
  cor: string | null;
  cambio: string | null;
  combustivel: string | null;
};

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function textoPreco(i: ItemCatalogo): string {
  if (i.precoPromocional != null && i.precoPromocional > 0 && i.precoPromocional < i.price) {
    return `${moeda(i.precoPromocional)} (promoção, de ${moeda(i.price)})`;
  }
  return i.price > 0 ? moeda(i.price) : "preço sob consulta";
}

function linhaItem(i: ItemCatalogo): string {
  const detalhes = [
    i.modelo && !i.name.toLowerCase().includes(i.modelo.toLowerCase()) ? i.modelo : "",
    i.anoFabricacao || i.anoModelo ? `ano ${i.anoFabricacao ?? "?"}/${i.anoModelo ?? "?"}` : "",
    i.km != null ? `${i.km.toLocaleString("pt-BR")} km` : "",
    i.cor ?? "",
    i.cambio ? CAMBIO[i.cambio] ?? "" : "",
    i.combustivel ? COMBUSTIVEL[i.combustivel] ?? "" : "",
  ].filter(Boolean);
  return `- ${i.name}: ${textoPreco(i)}${detalhes.length ? ` (${detalhes.join(", ")})` : ""}`;
}

export function formatarCatalogoInstagram(itens: ItemCatalogo[], urlCatalogo: string): string {
  if (itens.length === 0) return "";

  const linhas: string[] = [];
  let total = 0;
  for (const item of itens) {
    const linha = linhaItem(item);
    if (total + linha.length > ORCAMENTO_CARACTERES) break;
    linhas.push(linha);
    total += linha.length + 1;
  }
  const parcial = linhas.length < itens.length;

  return `\n\nCATÁLOGO ATUAL DA EMPRESA (faz parte dos fatos da empresa; use estes dados quando perguntarem preço ou disponibilidade):
${linhas.join("\n")}${parcial ? "\n(lista parcial: o catálogo completo está no link abaixo)" : ""}

Catálogo online (link público): ${urlCatalogo}

Como usar o catálogo:
- Se o item estiver na lista, informe o preço e os detalhes dele. Nunca diga que não tem o preço de um item listado.
- Nunca invente item, preço ou característica que não esteja na lista.
- Se o cliente disser só "esse" ou "desse" sem citar o modelo, pergunte qual modelo ele viu.
- Se pedir fotos ou quiser ver as opções, envie o link do catálogo online puro, sem colchetes nem parênteses.
- Se o item não estiver na lista, diga que ele não aparece no catálogo agora, sugira opções parecidas da lista e ofereça encaminhar para a equipe confirmar a disponibilidade.`;
}

export async function buildCatalogoInstagramContext(config: { id: string; commerceEnabled: boolean }): Promise<string> {
  if (!config.commerceEnabled) return "";

  const itens = await prisma.product.findMany({
    where: { agentConfigId: config.id, active: true },
    orderBy: { name: "asc" },
    take: 300,
    select: {
      name: true, price: true, precoPromocional: true, modelo: true, anoFabricacao: true, anoModelo: true,
      km: true, cor: true, cambio: true, combustivel: true,
    },
  });
  if (itens.length === 0) return "";

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/loja/${await ensureStoreSlug(config.id)}`;
  return formatarCatalogoInstagram(itens, url);
}
