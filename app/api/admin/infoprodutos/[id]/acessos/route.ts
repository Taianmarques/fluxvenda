import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";

const schema = z.object({ email: z.string().trim().toLowerCase().email("E-mail inválido") });

// Liberação manual de um produto pra uma conta existente (cortesia, suporte, parceria). Fica
// registrada como origem ADMIN — independente de compras, então reembolso não a derruba.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await exigirAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id: produtoId } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const profile = await prisma.profile.findFirst({ where: { email: { equals: body.data.email, mode: "insensitive" } }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Não há conta com esse e-mail. A pessoa precisa se cadastrar (ou comprar) antes." }, { status: 404 });

  const existente = await prisma.acessoProduto.findFirst({ where: { profileId: profile.id, produtoId, origem: "ADMIN" } });
  if (existente) {
    await prisma.acessoProduto.update({ where: { id: existente.id }, data: { ativo: true, revogadoEm: null, motivo: null, concedidoPor: adminId } });
  } else {
    await prisma.acessoProduto.create({ data: { profileId: profile.id, produtoId, origem: "ADMIN", concedidoPor: adminId } });
  }
  return NextResponse.json({ ok: true });
}
