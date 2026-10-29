import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarPerfil, lerCampos, montarPromptParaCopiar, podeUsarCentral, verificarUsoFerramenta } from "@/lib/central";
import { validarEntradas } from "@/lib/central-entradas";

// "Copiar prompt" — só nas ferramentas em que o admin liberou: devolve o prompt já preenchido
// com o formulário, o perfil e as regras, pronto pra colar no ChatGPT/Claude do próprio usuário.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug } });
  if (!ferramenta || !ferramenta.publicada || !ferramenta.permitirCopiarPrompt) {
    return NextResponse.json({ error: "Essa ferramenta não permite copiar o prompt" }, { status: 404 });
  }

  // Copiar não consome IA, então o limite diário não conta aqui — só a regra de quem pode usar
  const uso = await verificarUsoFerramenta(userId, { ...ferramenta, limiteDiario: null });
  if (!uso.permitido) return NextResponse.json({ error: uso.motivo }, { status: 403 });

  const body = await req.json().catch(() => null);
  const campos = lerCampos(ferramenta.campos);
  const v = validarEntradas(campos, body?.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const prompt = montarPromptParaCopiar({
    prompt: ferramenta.prompt, instrucoes: ferramenta.instrucoes, formatoResposta: ferramenta.formatoResposta, entradas: v.entradas, perfil: await carregarPerfil(userId), campos,
  });
  return NextResponse.json({ prompt });
}
