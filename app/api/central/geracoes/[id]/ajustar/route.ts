import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ajustarResultado, carregarPerfil, lerCampos, podeUsarCentral, verificarUsoFerramenta } from "@/lib/central";
import { getTeamIdForUser, isOverQuota, logTokenUsage } from "@/lib/token-usage";

const schema = z.object({
  pedido: z.string().trim().min(3, "Diga o que você quer ajustar").max(2000),
  resultado: z.string().max(50000).optional(), // texto atual, se a pessoa editou antes de pedir o ajuste
});

// "Ajustar com IA": cria uma nova versão a partir de uma geração do próprio usuário, aplicando só
// o que ele pediu. A versão anterior continua no histórico. Conta como uso (limite diário e créditos).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const { id } = await params;
  const origem = await prisma.centralGeracao.findFirst({ where: { id, profileId: userId }, include: { ferramenta: true } });
  if (!origem || !origem.ferramenta.publicada) return NextResponse.json({ error: "Resultado não encontrado" }, { status: 404 });

  const uso = await verificarUsoFerramenta(userId, origem.ferramenta);
  if (!uso.permitido) return NextResponse.json({ error: uso.motivo }, { status: 429 });

  const teamId = await getTeamIdForUser(userId);
  if (teamId && (await isOverQuota(teamId))) {
    return NextResponse.json({ error: "Os créditos de IA do mês acabaram. Peça ao gestor para comprar mais em Créditos de IA." }, { status: 402 });
  }

  const entradas = (origem.entradas ?? {}) as Record<string, string>;
  try {
    const r = await ajustarResultado({
      prompt: origem.ferramenta.prompt, entradas, perfil: await carregarPerfil(userId), campos: lerCampos(origem.ferramenta.campos),
      resultadoAtual: body.data.resultado?.trim() || origem.resultado, pedido: body.data.pedido,
    });
    if (!r.texto) return NextResponse.json({ error: "A IA não devolveu resposta. Tente de novo." }, { status: 502 });
    if (teamId) logTokenUsage({ teamId, provider: r.provider, model: r.model, feature: "central-ajuste", inputTokens: r.inputTokens, outputTokens: r.outputTokens }).catch(() => {});

    const nova = await prisma.centralGeracao.create({
      data: {
        profileId: userId, teamId, ferramentaId: origem.ferramentaId, entradas, resultado: r.texto,
        ajusteDeId: origem.id, pedidoAjuste: body.data.pedido,
        provider: r.provider, model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens,
      },
    });
    return NextResponse.json({
      geracao: { id: nova.id, resultado: nova.resultado, salvo: false, createdAt: nova.createdAt, entradas, pedidoAjuste: nova.pedidoAjuste, editado: false },
      usosHoje: uso.limite ? uso.usosHoje + 1 : null,
    });
  } catch (err) {
    console.error("[central/ajustar]", id, err);
    return NextResponse.json({ error: "Não foi possível ajustar agora. Tente de novo em instantes." }, { status: 502 });
  }
}
