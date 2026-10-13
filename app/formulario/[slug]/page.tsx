import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioClient, type LeadFormQuestion } from "./FormularioClient";

// Formulários de gestor do CRM não falam do teste grátis da FluxVenda (texto padrão do FormularioClient)
const DONE_NEUTRO = "Prontinho! Recebemos seus dados e já te chamamos no seu WhatsApp. Fica de olho por lá.";

export default async function FormularioPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: { headline: true, questions: true, pixelId: true, avatarUrl: true, active: true, agentOwned: true, doneMessage: true },
  });
  if (!form || !form.active) notFound();

  return (
    <FormularioClient
      slug={slug}
      headline={form.headline}
      questions={form.questions as LeadFormQuestion[]}
      pixelId={form.pixelId}
      avatarUrl={form.avatarUrl}
      doneMessage={form.doneMessage?.trim() || (form.agentOwned ? DONE_NEUTRO : null)}
    />
  );
}
