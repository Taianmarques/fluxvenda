import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { FormulariosClient } from "../../formularios/FormulariosClient";

export default async function FormulariosPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
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

  const forms = await prisma.leadForm.findMany({
    where: { agentConfigId: result.config.id, agentOwned: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <FormulariosClient
      agentId={result.config.id}
      initialForms={forms.map(f => ({
        id: f.id, slug: f.slug, title: f.title, active: f.active,
        submissionCount: f._count.submissions, createdAt: f.createdAt.toISOString(),
      }))}
    />
  );
}
