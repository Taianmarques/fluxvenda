import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { createDemoAccount } from "@/lib/demo-accounts";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const teams = await prisma.team.findMany({
    where: { isDemo: true },
    orderBy: { createdAt: "desc" },
    include: { agentConfigs: { select: { id: true }, take: 1 } },
  });

  return NextResponse.json({
    contas: teams.map(t => ({
      teamId: t.id,
      name: t.name,
      segmento: t.segment,
      subsegmento: t.subsegment,
      createdAt: t.createdAt,
      agentId: t.agentConfigs[0]?.id ?? null,
    })),
  });
}

const showcaseSchema = z.object({
  produto: z.boolean().default(true),
  foto: z.boolean().default(true),
  agendamento: z.boolean().default(true),
  pagamento: z.boolean().default(true),
});

const schema = z.object({
  segmento: z.enum(SEGMENTS),
  subsegmento: z.string().trim().min(1),
  conversasPorEtapa: z.number().int().min(1).max(5).default(1),
  valorMin: z.number().min(0).max(1_000_000).default(500),
  valorMax: z.number().min(0).max(1_000_000).default(4500),
  showcase: showcaseSchema.default({}),
  // Foto real do produto, opcional — sem ela, a conversa vitrine usa uma placeholder gerada
  fotoProduto: z.object({ base64: z.string().min(1).max(8_000_000), mimeType: z.string().min(1).max(60) }).nullable().optional(),
  cenariosExtras: z.array(z.string().trim().min(1).max(200)).max(5).default([]),
}).refine(d => d.valorMax >= d.valorMin, { message: "Valor máximo deve ser maior ou igual ao mínimo", path: ["valorMax"] });

// Cria uma conta de exemplo completa (equipe + agente + pipeline + conversas simuladas por
// IA) — ver lib/demo-accounts.ts. Chamada síncrona: leva alguns segundos por causa da geração
// de diálogo por etapa do funil.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const subsegmentosValidos = SUBSEGMENTS[body.data.segmento] ?? [];
  if (!subsegmentosValidos.includes(body.data.subsegmento)) {
    return NextResponse.json({ error: "Subsegmento inválido pra esse segmento" }, { status: 400 });
  }

  try {
    const { teamId, agentId } = await createDemoAccount(body.data.segmento, body.data.subsegmento, {
      conversasPorEtapa: body.data.conversasPorEtapa,
      valorMin: body.data.valorMin,
      valorMax: body.data.valorMax,
      showcase: body.data.showcase,
      fotoProduto: body.data.fotoProduto ?? null,
      cenariosExtras: body.data.cenariosExtras,
    });
    return NextResponse.json({ teamId, agentId });
  } catch (err) {
    console.error("[admin/contas-exemplo] erro ao criar conta de exemplo:", err);
    return NextResponse.json({ error: "Erro ao gerar a conta de exemplo" }, { status: 500 });
  }
}
