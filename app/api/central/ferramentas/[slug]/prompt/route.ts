import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarPerfil, lerCampos, podeUsarCentral } from "@/lib/central";
import { validarEntradas } from "@/lib/central-entradas";
import { montarPrompt, perfilComoTexto } from "@/lib/central-shared";

// "Copiar prompt" — só nas ferramentas em que o admin liberou: devolve o prompt já preenchido
// com o formulário e o perfil, pronto pra colar no ChatGPT/Claude do próprio usuário.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug } });
  if (!ferramenta || !ferramenta.publicada || !ferramenta.permitirCopiarPrompt) {
    return NextResponse.json({ error: "Essa ferramenta não permite copiar o prompt" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const campos = lerCampos(ferramenta.campos);
  const v = validarEntradas(campos, body?.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const perfil = await carregarPerfil(userId);
  const contexto = perfilComoTexto(perfil);
  const partes = [
    contexto ? `Contexto da minha empresa:\n${contexto}` : "",
    montarPrompt(ferramenta.prompt, v.entradas, perfil, campos),
    ferramenta.instrucoes.trim() ? `Instruções para a resposta:\n${ferramenta.instrucoes.trim()}` : "",
  ].filter(Boolean);
  return NextResponse.json({ prompt: partes.join("\n\n") });
}
