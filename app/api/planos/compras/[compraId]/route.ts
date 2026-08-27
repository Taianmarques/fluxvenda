import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

// Polling de status usado pelo modal de planos enquanto aguarda a confirmação do Asaas
// (o plano é atualizado pelo webhook — aqui só lemos o status já resolvido no banco)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ compraId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { compraId } = await params;
  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const compra = await prisma.planPurchase.findFirst({ where: { id: compraId, teamId: team.id } });
  if (!compra) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ status: compra.status });
}
