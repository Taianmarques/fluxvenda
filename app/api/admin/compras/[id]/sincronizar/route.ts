import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { sincronizarCompra } from "@/lib/compras";

// Admin: reconsulta a cobrança no Asaas e aplica o status (útil se um webhook se perdeu)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const profile = userId ? await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }) : null;
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const status = await sincronizarCompra(id);
  return NextResponse.json({ status });
}
