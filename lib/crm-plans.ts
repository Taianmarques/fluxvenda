import "server-only";
import { prisma } from "@/lib/prisma";
import { type BillingCycle, type CrmPlanTier, type CyclePricing } from "./crm-plans-shared";

export { BILLING_CYCLES, getSavingsCentavos, type BillingCycle, type CrmPlanTier } from "./crm-plans-shared";

// Planos do CRM oferecidos na aba Recursos > Ver planos. Editáveis pelo super admin em
// /admin/planos (model CrmPlanTier) — antes eram hardcoded aqui. Cobrança avulsa e à vista
// por ciclo via Asaas (sem parcelamento, sem renovação automática — quem quiser o ciclo
// seguinte compra de novo) e sem aplicação automática dos limites listados nas features.

// O valor "por mês" do semestral/anual é sempre derivado do total à vista (nunca guardado
// à parte) — assim editar um preço no admin não corre o risco de deixar os dois dessincronizados.
function buildPricing(precoMensal: number, precoSemestral: number, precoAnual: number): Record<BillingCycle, CyclePricing> {
  return {
    MENSAL: { valorMensalCentavos: precoMensal, totalCentavos: precoMensal },
    SEMESTRAL: { valorMensalCentavos: Math.round(precoSemestral / 6), totalCentavos: precoSemestral },
    ANUAL: { valorMensalCentavos: Math.round(precoAnual / 12), totalCentavos: precoAnual },
  };
}

function toTier(r: {
  id: string; label: string; description: string; destaque: boolean; features: unknown;
  precoMensalCentavos: number; precoSemestralCentavos: number; precoAnualCentavos: number;
}): CrmPlanTier {
  return {
    id: r.id,
    label: r.label,
    description: r.description,
    destaque: r.destaque,
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    pricing: buildPricing(r.precoMensalCentavos, r.precoSemestralCentavos, r.precoAnualCentavos),
  };
}

// Planos ativos, ordenados — usado na grade pública (Hub > Ver planos).
export async function getCrmPlanTiers(): Promise<CrmPlanTier[]> {
  const rows = await prisma.crmPlanTier.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  return rows.map(toTier);
}

// Um plano específico, só se ativo — usado no checkout pra buscar o preço real (nunca confia
// no valor vindo do cliente) e pra impedir comprar um plano que o admin já aposentou.
export async function getCrmPlanTier(id: string): Promise<CrmPlanTier | undefined> {
  const r = await prisma.crmPlanTier.findUnique({ where: { id } });
  if (!r || !r.active) return undefined;
  return toTier(r);
}
