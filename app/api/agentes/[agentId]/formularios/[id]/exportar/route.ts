import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { buildSubmissionsCsv } from "@/lib/lead-form-stats";
import type { LeadFormQuestion } from "@/lib/lead-form-shared";

// Exporta as respostas do formulário em CSV — só gestor, só de formulário criado no CRM pra esse agente
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, id } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const form = await prisma.leadForm.findFirst({ where: { id, agentConfigId: config.id, agentOwned: true } });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const csv = await buildSubmissionsCsv(form.id, form.questions as LeadFormQuestion[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="respostas-${form.slug}.csv"`,
    },
  });
}
