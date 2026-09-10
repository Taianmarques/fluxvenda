import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioEditorClient, type LeadFormQuestion } from "./FormularioEditorClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminFormularioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 200 } },
  });
  if (!form) notFound();

  return (
    <FormularioEditorClient
      id={form.id}
      initialSlug={form.slug}
      initialTitle={form.title}
      initialHeadline={form.headline}
      initialActive={form.active}
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
  );
}
