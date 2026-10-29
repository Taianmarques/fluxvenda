import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { podeUsarCentral } from "@/lib/central";

// Liga/desliga o favorito da ferramenta pro usuário logado
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug }, select: { id: true } });
  if (!ferramenta) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });

  const where = { profileId_ferramentaId: { profileId: userId, ferramentaId: ferramenta.id } };
  const existente = await prisma.centralFavorito.findUnique({ where });
  if (existente) {
    await prisma.centralFavorito.delete({ where });
    return NextResponse.json({ favorito: false });
  }
  await prisma.centralFavorito.create({ data: { profileId: userId, ferramentaId: ferramenta.id } }).catch(() => null);
  return NextResponse.json({ favorito: true });
}
