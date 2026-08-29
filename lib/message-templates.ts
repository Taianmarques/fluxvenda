import "server-only";
import { prisma } from "@/lib/prisma";

// Renderiza um MessageTemplate do banco substituindo {{placeholder}} pelos valores passados.
// Se o registro não existir (nunca deveria acontecer depois do seed, mas por segurança —
// ex: banco restaurado de um backup anterior à migration), cai no texto fixo de `fallback`,
// que é o mesmo texto que já estava hardcoded antes dessa feature existir.
export async function renderMessageTemplate(id: string, vars: Record<string, string>, fallback: string): Promise<string> {
  const tpl = await prisma.messageTemplate.findUnique({ where: { id } });
  const body = tpl?.body ?? fallback;
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), body);
}
