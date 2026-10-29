import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { carregarFerramentaTela } from "@/lib/central-dados";
import { temAcessoAoProduto } from "@/lib/infoprodutos";

// Dados da ferramenta pro painel lateral da biblioteca (sem o prompt interno) — só pra quem tem
// acesso ao produto da ferramenta
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const dados = await carregarFerramentaTela(userId, slug);
  if (!dados) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  if (!(await temAcessoAoProduto(userId, dados.ferramenta.produto.id))) {
    return NextResponse.json({ error: "Você ainda não tem acesso a este produto" }, { status: 403 });
  }
  return NextResponse.json(dados);
}
