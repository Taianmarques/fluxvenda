// Tipos e cálculos puros dos planos do CRM — sem "server-only", pra poder ser importado
// tanto de Server Components/rotas (junto com lib/crm-plans.ts, que busca do banco) quanto
// de Client Components como PlanosModal.tsx (que recebe os planos via fetch em /api/planos).
export type BillingCycle = "MENSAL" | "SEMESTRAL" | "ANUAL";

export const BILLING_CYCLES: { id: BillingCycle; label: string; meses: number }[] = [
  { id: "ANUAL", label: "Anual", meses: 12 },
  { id: "SEMESTRAL", label: "Semestral", meses: 6 },
  { id: "MENSAL", label: "Mensal", meses: 1 },
];

export type CyclePricing = { valorMensalCentavos: number; totalCentavos: number };

export type CrmPlanTier = {
  id: string;
  label: string;
  description: string;
  destaque?: boolean;
  features: string[];
  pricing: Record<BillingCycle, CyclePricing>;
};

export function getSavingsCentavos(tier: CrmPlanTier, cycle: BillingCycle): number {
  return tier.pricing.MENSAL.valorMensalCentavos - tier.pricing[cycle].valorMensalCentavos;
}
