import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CONFIGURABLE_PAGE_KEYS, type CrmPageKey } from "@/lib/crm-nav-config";

const patchSchema = z.object({
  nome: z.string().min(1).max(40).optional(),
  allowedPages: z.array(z.enum(CONFIGURABLE_PAGE_KEYS as [CrmPageKey, ...CrmPageKey[]])).optional(),
});

async function assertManager(userId: string, perfilId: string) {
  const perfil = await prisma.crmAccessProfile.findUnique({ where: { id: perfilId }, include: { team: true } });
  if (!perfil || perfil.team.managerId !== userId) return null;
  return perfil;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ perfilId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { perfilId } = await params;
  if (!(await assertManager(userId, perfilId))) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.crmAccessProfile.update({ where: { id: perfilId }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ perfilId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { perfilId } = await params;
  if (!(await assertManager(userId, perfilId))) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  // Membros com esse perfil voltam a ter acesso total (SetNull no schema)
  await prisma.crmAccessProfile.delete({ where: { id: perfilId } });
  return NextResponse.json({ ok: true });
}
