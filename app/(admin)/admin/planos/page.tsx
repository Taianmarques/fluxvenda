import { prisma } from "@/lib/prisma";
import { PlanosAdminClient } from "./PlanosAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminPlanosPage() {
  const tiers = await prisma.crmPlanTier.findMany({ orderBy: { order: "asc" } });

  return (
    <PlanosAdminClient
      initialTiers={tiers.map(t => ({
        id: t.id,
        label: t.label,
        description: t.description,
        destaque: t.destaque,
        active: t.active,
        order: t.order,
        features: Array.isArray(t.features) ? (t.features as string[]) : [],
        precoMensalCentavos: t.precoMensalCentavos,
        precoSemestralCentavos: t.precoSemestralCentavos,
        precoAnualCentavos: t.precoAnualCentavos,
      }))}
    />
  );
}
