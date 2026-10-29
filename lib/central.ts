import { prisma } from "@/lib/prisma";
import { getTeamIdForUser } from "@/lib/token-usage";
import { getEffectiveProducts, hasProduct } from "@/lib/products";
import { PERFIL_CAMPOS, PERFIL_VAZIO, type CampoFerramenta, type PerfilEmpresaDados } from "@/lib/central-shared";

// Central de Ferramentas Comerciais — acesso, perfil da empresa e regras de uso (servidor).
// A Central não executa IA: monta prompts pro usuário rodar no ChatGPT/Claude dele
// (ver lib/central-prompt.ts).

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

// Quem pode usar a ferramenta e quanto ainda pode usar hoje (limite de prompts preparados por
// usuário por dia, configurável no admin)
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
    usosHoje = await prisma.centralGeracao.count({ where: { profileId: userId, ferramentaId: f.id, tipo: "prompt", createdAt: { gte: inicioDia } } });
    if (usosHoje >= f.limiteDiario) {
      return { permitido: false as const, motivo: `Você já preparou ${f.limiteDiario} ${f.limiteDiario === 1 ? "prompt" : "prompts"} nesta ferramenta hoje, que é o limite diário. Volte amanhã!`, usosHoje, limite: f.limiteDiario };
    }
  }
  return { permitido: true as const, motivo: null, usosHoje, limite: f.limiteDiario };
}
