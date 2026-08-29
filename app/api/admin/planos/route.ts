import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Lista TODOS os planos (inclusive inativos) — a grade pública (/api/planos) só mostra os
// ativos; aqui o admin precisa ver e poder reativar os que ele mesmo aposentou.
export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const tiers = await prisma.crmPlanTier.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ tiers });
}

const createSchema = z.object({
  id: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_]+$/, { message: "Use só letras maiúsculas, números e _ (ex: STARTER_PLUS)." }),
  label: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).default(""),
  destaque: z.boolean().default(false),
  order: z.number().int().default(0),
  features: z.array(z.string().trim().min(1).max(200)).default([]),
  precoMensalCentavos: z.number().int().min(0),
  precoSemestralCentavos: z.number().int().min(0),
  precoAnualCentavos: z.number().int().min(0),
});

// Cria um novo plano — o "id" vira a chave usada em PlanPurchase.tier pra sempre, então é
// definido só na criação (a edição depois não deixa mudar).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existe = await prisma.crmPlanTier.findUnique({ where: { id: body.data.id } });
  if (existe) return NextResponse.json({ error: "Já existe um plano com esse identificador." }, { status: 400 });

  const tier = await prisma.crmPlanTier.create({ data: body.data });
  return NextResponse.json({ tier });
}
