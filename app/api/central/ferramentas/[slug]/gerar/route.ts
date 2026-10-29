import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarPerfil, gerarComFerramenta, lerCampos, podeUsarCentral } from "@/lib/central";
import { validarEntradas } from "@/lib/central-entradas";
import { getTeamIdForUser, isOverQuota, logTokenUsage } from "@/lib/token-usage";

// "Gerar com IA": monta o prompt interno da ferramenta com o formulário + perfil da empresa,
// chama a IA, guarda no histórico e devolve o texto. O prompt nunca sai do servidor.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const { slug } = await params;
  const ferramenta = await prisma.centralFerramenta.findUnique({ where: { slug } });
  if (!ferramenta || !ferramenta.publicada) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const campos = lerCampos(ferramenta.campos);
  const v = validarEntradas(campos, body?.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const teamId = await getTeamIdForUser(userId);
  if (teamId && (await isOverQuota(teamId))) {
    return NextResponse.json({ error: "Os créditos de IA do mês acabaram. Peça ao gestor para comprar mais em Créditos de IA." }, { status: 402 });
  }

  try {
    const perfil = await carregarPerfil(userId);
    const r = await gerarComFerramenta({ prompt: ferramenta.prompt, instrucoes: ferramenta.instrucoes, entradas: v.entradas, perfil, campos });
    if (!r.texto) return NextResponse.json({ error: "A IA não devolveu resposta. Tente de novo." }, { status: 502 });
    if (teamId) logTokenUsage({ teamId, provider: r.provider, model: r.model, feature: "central", inputTokens: r.inputTokens, outputTokens: r.outputTokens }).catch(() => {});

    const geracao = await prisma.centralGeracao.create({
      data: {
        profileId: userId, teamId, ferramentaId: ferramenta.id, entradas: v.entradas, resultado: r.texto,
        provider: r.provider, model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens,
      },
    });
    return NextResponse.json({ geracao: { id: geracao.id, resultado: geracao.resultado, salvo: false, createdAt: geracao.createdAt, entradas: v.entradas } });
  } catch (err) {
    console.error("[central/gerar]", slug, err);
    return NextResponse.json({ error: "Não foi possível gerar agora. Tente de novo em instantes." }, { status: 502 });
  }
}
