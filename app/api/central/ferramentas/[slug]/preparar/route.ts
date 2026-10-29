import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarPerfil, lerCampos, verificarUsoFerramenta } from "@/lib/central";
import { temAcessoAFerramenta } from "@/lib/infoprodutos";
import { montarPromptFinal } from "@/lib/central-prompt";
import { validarEntradas } from "@/lib/central-entradas";

// "Preparar meu prompt": monta o prompt da ferramenta com o formulário e o perfil da empresa e
// guarda no histórico do usuário. Não chama IA nenhuma — o usuário roda no ChatGPT/Claude dele.
// O template interno só sai daqui já preenchido, nunca cru.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug }, include: { modulo: { select: { produtoId: true } } } });
  if (!ferramenta || !ferramenta.publicada) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });
  if (!(await temAcessoAFerramenta(userId, ferramenta))) return NextResponse.json({ error: "Você ainda não tem acesso a este produto" }, { status: 403 });

  const uso = await verificarUsoFerramenta(userId, ferramenta);
  if (!uso.permitido) return NextResponse.json({ error: uso.motivo }, { status: 429 });

  const body = await req.json().catch(() => null);
  const campos = lerCampos(ferramenta.campos);
  const v = validarEntradas(campos, body?.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const prompt = montarPromptFinal({
    prompt: ferramenta.prompt, instrucoes: ferramenta.instrucoes, formatoResposta: ferramenta.formatoResposta,
    entradas: v.entradas, perfil: await carregarPerfil(userId), campos,
  });

  const geracao = await prisma.centralGeracao.create({
    data: {
      profileId: userId, teamId: null, ferramentaId: ferramenta.id, tipo: "prompt",
      entradas: v.entradas, resultado: prompt, provider: "local", model: "template",
    },
  });
  return NextResponse.json({
    geracao: { id: geracao.id, resultado: prompt, salvo: false, createdAt: geracao.createdAt, entradas: v.entradas },
    usosHoje: uso.limite ? uso.usosHoje + 1 : null,
  });
}
