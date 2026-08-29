import { prisma } from "@/lib/prisma";
import { TRIAL_FUNNEL_STEPS } from "@/lib/trial-funnel-shared";
import { FunilTrialAdminClient } from "./FunilTrialAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminFunilTrialPage() {
  const ids = TRIAL_FUNNEL_STEPS.map(s => s.id);
  const templates = await prisma.messageTemplate.findMany({ where: { id: { in: ids } } });
  const byId = new Map(templates.map(t => [t.id, t]));

  const steps = TRIAL_FUNNEL_STEPS.map(step => {
    const t = byId.get(step.id);
    return {
      id: step.id,
      whenLabel: step.whenLabel,
      label: t?.label ?? step.id,
      description: t?.description ?? "",
      body: t?.body ?? "",
      placeholders: Array.isArray(t?.placeholders) ? (t!.placeholders as string[]) : [],
    };
  });

  return <FunilTrialAdminClient initialSteps={steps} />;
}
