import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeFormFunnelSteps } from "@/lib/lead-form-funnel";
import { getFormStats } from "@/lib/lead-form-stats";
import { resolveCheckoutAgent } from "@/lib/lead-form-checkout";
import { formToExtras, normalizeQuizResults, normalizeSteps, type LeadFormUtm } from "@/lib/lead-form-shared";
import { FormularioEditorClient, type LeadFormQuestion } from "./FormularioEditorClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminFormularioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { id },
    include: {
      submissions: { orderBy: { createdAt: "desc" }, take: 200 },
      agentConfig: { select: { id: true, nome: true, team: { select: { name: true } } } },
    },
  });
  if (!form) notFound();
  const checkoutAgent = await resolveCheckoutAgent(form.agentConfigId);
  const stats = await getFormStats(form.id, form.questions as LeadFormQuestion[], form.quizResults);

  return (
    <FormularioEditorClient
      id={form.id}
      initialSlug={form.slug}
      initialTitle={form.title}
      initialHeadline={form.headline}
      initialActive={form.active}
      initialPixelId={form.pixelId ?? ""}
      initialAvatarUrl={form.avatarUrl}
      initialAgentConfigId={form.agentConfigId}
      initialAgentLabel={form.agentConfig ? `${form.agentConfig.nome} — ${form.agentConfig.team.name}` : null}
      initialInviteMessage={form.inviteMessage ?? ""}
      initialDoneMessage={form.doneMessage ?? ""}
      initialExtras={formToExtras(form)}
      stats={stats}
      initialFunnelSteps={normalizeFormFunnelSteps(form.funnelSteps)}
      initialQuestions={form.questions as LeadFormQuestion[]}
      initialQuizResults={normalizeQuizResults(form.quizResults)}
      initialStyle={form.style === "TELAS" ? "TELAS" : "CHAT"}
      asaasOk={Boolean(checkoutAgent?.asaasApiKey)}
      initialSteps={normalizeSteps(form.steps)}
      submissions={form.submissions.map(s => ({
        id: s.id,
        nome: s.nome,
        whatsapp: s.whatsapp,
        answers: s.answers as Record<string, string>,
        inviteSentAt: s.inviteSentAt?.toISOString() ?? null,
        inviteError: s.inviteError,
        quizResult: s.quizResult,
        utm: (s.utm as LeadFormUtm | null) ?? null,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
