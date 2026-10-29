import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { temAcessoAFerramenta } from "@/lib/infoprodutos";

// Liga/desliga o favorito da ferramenta pro usuário logado
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug }, select: { id: true, modulo: { select: { produtoId: true } } } });
  if (!ferramenta) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  if (!(await temAcessoAFerramenta(userId, ferramenta))) return NextResponse.json({ error: "Você ainda não tem acesso a este produto" }, { status: 403 });

  const where = { profileId_ferramentaId: { profileId: userId, ferramentaId: ferramenta.id } };
  const existente = await prisma.centralFavorito.findUnique({ where });
  if (existente) {
    await prisma.centralFavorito.delete({ where });
    return NextResponse.json({ favorito: false });
  }
  await prisma.centralFavorito.create({ data: { profileId: userId, ferramentaId: ferramenta.id } }).catch(() => null);
  return NextResponse.json({ favorito: true });
}
