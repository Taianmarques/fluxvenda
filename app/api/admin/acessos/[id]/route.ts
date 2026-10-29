import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";

const schema = z.object({ ativo: z.boolean() });

// Revoga ou restaura um acesso específico (só aquela fonte — outras compras do mesmo produto seguem)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const acesso = await prisma.acessoProduto.update({
    where: { id },
    data: body.data.ativo ? { ativo: true, revogadoEm: null, motivo: null } : { ativo: false, revogadoEm: new Date(), motivo: "Revogado pelo admin" },
  }).catch(() => null);
  if (!acesso) return NextResponse.json({ error: "Acesso não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
