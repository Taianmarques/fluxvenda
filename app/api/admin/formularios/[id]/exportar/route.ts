import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { buildSubmissionsCsv } from "@/lib/lead-form-stats";
import type { LeadFormQuestion } from "@/lib/lead-form-shared";

// Exporta as respostas do formulário em CSV — só super admin
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const profile = userId ? await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }) : null;
  if (!userId || profile?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const form = await prisma.leadForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const csv = await buildSubmissionsCsv(form.id, form.questions as LeadFormQuestion[], form.quizResults);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="respostas-${form.slug}.csv"`,
    },
  });
}
