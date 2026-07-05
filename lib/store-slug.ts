import { prisma } from "@/lib/prisma";

// "Atmos Marcenaria & Cia" → "atmos-marcenaria-cia"
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Garante que o agente tem um slug de loja (gera do nome da empresa na primeira vez).
// Retorna o slug — ou o próprio id como fallback se algo falhar.
export async function ensureStoreSlug(agentConfigId: string): Promise<string> {
  try {
    const config = await prisma.agentConfig.findUnique({
      where: { id: agentConfigId },
      select: { storeSlug: true, team: { select: { name: true } } },
    });
    if (!config) return agentConfigId;
    if (config.storeSlug) return config.storeSlug;

    const base = slugify(config.team?.name || "") || "loja";
    let slug = base;
    for (let i = 2; i <= 50; i++) {
      const clash = await prisma.agentConfig.findUnique({ where: { storeSlug: slug }, select: { id: true } });
      if (!clash) break;
      slug = `${base}-${i}`;
    }

    await prisma.agentConfig.update({ where: { id: agentConfigId }, data: { storeSlug: slug } });
    return slug;
  } catch {
    return agentConfigId;
  }
}
