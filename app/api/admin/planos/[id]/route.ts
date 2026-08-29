import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const patchSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  destaque: z.boolean().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  features: z.array(z.string().trim().min(1).max(200)).optional(),
  precoMensalCentavos: z.number().int().min(0).optional(),
  precoSemestralCentavos: z.number().int().min(0).optional(),
  precoAnualCentavos: z.number().int().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existe = await prisma.crmPlanTier.findUnique({ where: { id } });
  if (!existe) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  const tier = await prisma.crmPlanTier.update({ where: { id }, data: body.data });
  return NextResponse.json({ tier });
}

// Exclusão física — o id não tem FK em PlanPurchase (é uma referência solta, ver
// schema.prisma), então não quebra o histórico de quem já comprou; só o rótulo/preço
// somem da tela de admin. Pra só esconder da grade pública sem perder o registro, usar
// PATCH { active: false } em vez de excluir.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const existe = await prisma.crmPlanTier.findUnique({ where: { id } });
  if (!existe) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  await prisma.crmPlanTier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
