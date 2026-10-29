import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  nome: z.string().trim().min(1).max(120).optional(),
  ativa: z.boolean().optional(),
  sandbox: z.boolean().optional(), // modo teste (conta sandbox do Asaas)
  // Lista completa de itens (substitui a atual): papel e preço de cada produto NESTA oferta
  itens: z.array(z.object({
    produtoId: z.string().min(1),
    papel: z.enum(["PRINCIPAL", "ORDER_BUMP", "UPSELL"]),
    precoCentavos: z.number().int().min(0).max(10_000_000),
    chamada: z.string().trim().max(500).default(""),
    ordem: z.number().int().min(0).max(100).default(0),
  })).max(20).optional(),
});

// Edita uma oferta: nome, ativa e itens. Os preços daqui são os cobrados no checkout.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { itens, ...dados } = body.data;

  if (itens) {
    if (new Set(itens.map(i => i.produtoId)).size !== itens.length) return NextResponse.json({ error: "Um produto aparece duas vezes na oferta" }, { status: 400 });
    if (!itens.some(i => i.papel === "PRINCIPAL")) return NextResponse.json({ error: "A oferta precisa de um produto principal" }, { status: 400 });
    // Asaas não cobra menos de R$ 5,00 — o principal sozinho já precisa passar disso
    if (itens.filter(i => i.papel === "PRINCIPAL").reduce((s, i) => s + i.precoCentavos, 0) < 500) {
      return NextResponse.json({ error: "O produto principal precisa custar pelo menos R$ 5,00 (mínimo do Asaas)" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.oferta.update({ where: { id }, data: dados }),
    ...(itens ? [
      prisma.ofertaItem.deleteMany({ where: { ofertaId: id } }),
      prisma.ofertaItem.createMany({ data: itens.map(i => ({ ...i, ofertaId: id })) }),
    ] : []),
  ]);
  return NextResponse.json({ ok: true });
}
