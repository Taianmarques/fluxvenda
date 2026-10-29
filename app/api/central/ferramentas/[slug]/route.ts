import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { podeUsarCentral } from "@/lib/central";
import { carregarFerramentaTela } from "@/lib/central-dados";

// Dados da ferramenta pro painel lateral da biblioteca (sem o prompt interno)
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const { slug } = await params;
  const dados = await carregarFerramentaTela(userId, slug);
  if (!dados) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  return NextResponse.json(dados);
}
