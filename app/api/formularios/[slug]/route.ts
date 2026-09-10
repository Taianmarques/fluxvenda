import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública — a página do formulário conversacional usa isso pra montar as perguntas.
// Não expõe nada além do necessário pra renderizar (sem submissions, sem ids internos extras).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: { id: true, title: true, headline: true, questions: true, active: true },
  });
  if (!form || !form.active) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json({ form });
}
