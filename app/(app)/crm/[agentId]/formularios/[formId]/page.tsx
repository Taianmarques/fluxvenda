import { currentUser } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { normalizeFormFunnelSteps } from "@/lib/lead-form-funnel";
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
        initialFunnelSteps={normalizeFormFunnelSteps(form.funnelSteps)}
        initialQuestions={form.questions as LeadFormQuestion[]}
        submissions={form.submissions.map(s => ({
          id: s.id,
          nome: s.nome,
          whatsapp: s.whatsapp,
          answers: s.answers as Record<string, string>,
          inviteSentAt: s.inviteSentAt?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
