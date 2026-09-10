import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioClient, type LeadFormQuestion } from "./FormularioClient";

export default async function FormularioPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: { headline: true, questions: true, pixelId: true, active: true },
  });
  if (!form || !form.active) notFound();

  return <FormularioClient slug={slug} headline={form.headline} questions={form.questions as LeadFormQuestion[]} pixelId={form.pixelId} />;
}
