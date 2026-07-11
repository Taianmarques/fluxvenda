import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  // Dados da empresa
  name: z.string().min(1).optional(),
  businessModel: z.string().optional(),
  segment: z.string().optional(),
  subsegment: z.string().optional(),
  size: z.string().optional(),
  // Dados do gestor
  managerName: z.string().min(1).optional(),
  managerPhone: z.string().optional(),
  managerPlan: z.enum(["FREE", "PRO", "TEAM"]).optional(),
  managerPlanExpiresAt: z.string().nullable().optional(), // ISO date string ou null
  // Produtos contratados — controlado exclusivamente pelo super admin (sem checkout automático ainda)
  productsOwned: z.array(z.enum(["CRM", "PLATAFORMA"])).optional(),
  crmTrialEndsAt: z.string().nullable().optional(), // ISO date string ou null (null = sem limite de teste)
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { name, businessModel, segment, subsegment, size, managerName, managerPhone, managerPlan, managerPlanExpiresAt, productsOwned, crmTrialEndsAt } = body.data;

  const [updatedTeam] = await prisma.$transaction([
    prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(businessModel !== undefined && { businessModel }),
        ...(segment !== undefined && { segment }),
        ...(subsegment !== undefined && { subsegment }),
        ...(size !== undefined && { size }),
        ...(productsOwned !== undefined && { productsOwned }),
        ...(crmTrialEndsAt !== undefined && { crmTrialEndsAt: crmTrialEndsAt ? new Date(crmTrialEndsAt) : null }),
      },
    }),
    prisma.profile.update({
      where: { id: team.managerId },
      data: {
        ...(managerName !== undefined && { name: managerName }),
        ...(managerPhone !== undefined && { phone: managerPhone }),
        ...(managerPlan !== undefined && { plan: managerPlan }),
        ...(managerPlanExpiresAt !== undefined && { planExpiresAt: managerPlanExpiresAt ? new Date(managerPlanExpiresAt) : null }),
      },
    }),
  ]);

  return NextResponse.json({ team: updatedTeam });
}
