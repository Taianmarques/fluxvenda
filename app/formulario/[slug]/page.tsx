import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioClient, type LeadFormQuestion } from "./FormularioClient";
import { QuizTelasClient } from "./QuizTelasClient";
import { normalizeSteps } from "@/lib/lead-form-shared";

// Formulários de gestor do CRM não falam do teste grátis da FluxVenda (texto padrão do FormularioClient)
const DONE_NEUTRO = "Prontinho! Recebemos seus dados e já te chamamos no seu WhatsApp. Fica de olho por lá.";

export default async function FormularioPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: {
      headline: true, questions: true, pixelId: true, avatarUrl: true, active: true, agentOwned: true, doneMessage: true,
      accentColor: true, coverUrl: true, ctaLabel: true, ctaUrl: true, waNumber: true, waButtonText: true, consentText: true,
      conversionUrl: true, style: true, steps: true,
    },
  });
  if (!form || !form.active) notFound();

  const steps = normalizeSteps(form.steps);
  if (form.style === "TELAS" && steps.length > 0) {
    return (
      <QuizTelasClient
        slug={slug}
        steps={steps}
        pixelId={form.pixelId}
        logoUrl={form.coverUrl}
        accentColor={form.accentColor}
        doneMessage={form.doneMessage?.trim() || (form.agentOwned ? DONE_NEUTRO : "Prontinho! Recebemos suas respostas e já te chamamos no seu WhatsApp.")}
        ctaLabel={form.ctaLabel}
        ctaUrl={form.ctaUrl}
        waNumber={form.waNumber}
        waButtonText={form.waButtonText}
        consentText={form.consentText?.trim() || null}
        conversionUrl={form.conversionUrl}
      />
    );
  }

  return (
    <FormularioClient
      slug={slug}
      headline={form.headline}
      questions={form.questions as LeadFormQuestion[]}
      pixelId={form.pixelId}
      avatarUrl={form.avatarUrl}
      doneMessage={form.doneMessage?.trim() || (form.agentOwned ? DONE_NEUTRO : null)}
      agentOwned={form.agentOwned}
      accentColor={form.accentColor}
      coverUrl={form.coverUrl}
      ctaLabel={form.ctaLabel}
      ctaUrl={form.ctaUrl}
      waNumber={form.waNumber}
      waButtonText={form.waButtonText}
      consentText={form.consentText?.trim() || null}
      conversionUrl={form.conversionUrl}
    />
  );
}
