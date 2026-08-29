import { NextResponse } from "next/server";
import { getCrmPlanTiers } from "@/lib/crm-plans";

// Rota pública — só expõe os planos ativos (preço/features), nada sensível. Usada pelo
// PlanosModal (client component) pra montar a grade "Ver planos" sem precisar de sessão.
export async function GET() {
  const tiers = await getCrmPlanTiers();
  return NextResponse.json({ tiers });
}
