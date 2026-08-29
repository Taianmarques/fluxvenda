import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const patchSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

// Só o corpo da mensagem é editável — label/description/placeholders são fixos por evento
// (definidos na migration), servem só de referência na tela.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existe = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!existe) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });

  const template = await prisma.messageTemplate.update({ where: { id }, data: { body: body.data.body } });
  return NextResponse.json({ template });
}
