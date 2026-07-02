import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["NOVO","ABORDADO","RESPONDEU","QUALIFICADO","REUNIAO_AGENDADA","DESCARTADO","ENCERRADO"]).optional(),
  notas: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect || !(await userBelongsToAgentConfig(userId, prospect.agentConfigId))) {
    return NextResponse.json({ error: "Prospect não encontrado" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const updated = await prisma.prospect.update({ where: { id }, data: body.data });
  return NextResponse.json({ prospect: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect || !(await userBelongsToAgentConfig(userId, prospect.agentConfigId))) {
    return NextResponse.json({ error: "Prospect não encontrado" }, { status: 404 });
  }

  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
