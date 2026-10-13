import { currentUser } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { normalizeFormFunnelSteps } from "@/lib/lead-form-funnel";
import { getFormStats } from "@/lib/lead-form-stats";
import { formToExtras, normalizeQuizResults, normalizeSteps, type LeadFormUtm } from "@/lib/lead-form-shared";
import { FormularioEditorClient, type LeadFormQuestion } from "@/app/(admin)/admin/formularios/[id]/FormularioEditorClient";

export default async function FormularioEditorPage({ params }: { params: Promise<{ agentId: string; formId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId, formId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  if (!result) redirect("/crm");

  if (!result.isManager) {
    return (
      <div className="h-full bg-gray-950 p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Lock size={48} className="mx-auto text-gray-600" />
          <h1 className="text-2xl font-bold">Restrito ao gestor</h1>
          <p className="text-gray-400">Os formulários de captação são uma ferramenta de gestão da equipe.</p>
        </div>
      </div>
    );
  }

  // Só formulários criados no CRM pra esse agente — os do super admin nunca abrem por aqui
  const form = await prisma.leadForm.findFirst({
    where: { id: formId, agentConfigId: result.config.id, agentOwned: true },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 200 } },
  });
  if (!form) notFound();

  const [stats, etiquetas, pipelines] = await Promise.all([
    getFormStats(form.id, form.questions as LeadFormQuestion[], form.quizResults),
    prisma.etiqueta.findMany({ where: { agentConfigId: result.config.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.pipeline.findMany({
      where: { agentConfigId: result.config.id }, orderBy: { order: "asc" },
      select: { name: true, stages: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <FormularioEditorClient
        id={form.id}
        crmAgentId={result.config.id}
        whatsappOk={Boolean(result.config.uazapiToken)}
        initialSlug={form.slug}
        initialTitle={form.title}
        initialHeadline={form.headline}
        initialActive={form.active}
        initialPixelId={form.pixelId ?? ""}
        initialAvatarUrl={form.avatarUrl}
        initialAgentConfigId={form.agentConfigId}
        initialAgentLabel={null}
        initialInviteMessage={form.inviteMessage ?? ""}
        initialDoneMessage={form.doneMessage ?? ""}
        initialExtras={formToExtras(form)}
        stats={stats}
        crmOptions={{
          etiquetas,
          stages: pipelines.flatMap(p => p.stages.map(s => ({ id: s.id, nome: s.name, pipeline: p.name }))),
        }}
        initialFunnelSteps={normalizeFormFunnelSteps(form.funnelSteps)}
        initialQuestions={form.questions as LeadFormQuestion[]}
        initialQuizResults={normalizeQuizResults(form.quizResults)}
        initialStyle={form.style === "TELAS" ? "TELAS" : "CHAT"}
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
    </div>
  );
}
