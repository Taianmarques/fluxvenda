import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getAgentConfigAsManager } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Todos os campos são opcionais — o painel de Distribuição salva cada controle
// independente (modo de distribuição, critérios de "quem a IA atende", vendedor dos
// handoffs da IA). Campo omitido = mantém o valor atual.
const schema = z.object({
  leadDistributionMode: z.enum(["MANUAL", "PRIMEIRO_A_ASSUMIR", "RODIZIO", "IA_QUALIFICACAO"]).optional(),
  iaIgnoraAtribuidos: z.boolean().optional(),
  transferirAoPedirFoto: z.boolean().optional(),
  iaLeadAttendantId: z.string().nullable().optional(), // "" ou null = padrão; "RODIZIO"; ou um profileId
  iaNiveisCarteiraExcluidos: z.array(z.enum(["A", "B", "C", "INATIVO", "PERDIDO"])).max(5).optional(),
});

// Só o gestor configura como os leads são distribuídos entre os atendentes da equipe
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const d = body.data;

  // Confirma que o vendedor escolhido pra receber leads da IA pertence a este time — evita
  // gravar um profileId arbitrário vindo do client. "" / null / "RODIZIO" passam direto.
  let resolvedIaLeadAttendantId: string | null | undefined;
  if (d.iaLeadAttendantId !== undefined) {
    const value = d.iaLeadAttendantId;
    if (!value || value === "RODIZIO") {
      resolvedIaLeadAttendantId = value || null;
    } else {
      const team = await prisma.team.findUnique({ where: { id: config.teamId } });
      const member = await prisma.teamMember.findUnique({ where: { profileId: value } });
      const pertence = team?.managerId === value || member?.teamId === config.teamId;
      resolvedIaLeadAttendantId = pertence ? value : null;
    }
  }

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: {
      ...(d.leadDistributionMode !== undefined && { leadDistributionMode: d.leadDistributionMode }),
      ...(d.iaIgnoraAtribuidos !== undefined && { iaIgnoraAtribuidos: d.iaIgnoraAtribuidos }),
      ...(d.transferirAoPedirFoto !== undefined && { transferirAoPedirFoto: d.transferirAoPedirFoto }),
      ...(resolvedIaLeadAttendantId !== undefined && { iaLeadAttendantId: resolvedIaLeadAttendantId }),
      ...(d.iaNiveisCarteiraExcluidos !== undefined && { iaNiveisCarteiraExcluidos: d.iaNiveisCarteiraExcluidos }),
    },
  });

  return NextResponse.json({
    leadDistributionMode: updated.leadDistributionMode,
    iaIgnoraAtribuidos: updated.iaIgnoraAtribuidos,
    transferirAoPedirFoto: updated.transferirAoPedirFoto,
    iaLeadAttendantId: updated.iaLeadAttendantId,
    iaNiveisCarteiraExcluidos: updated.iaNiveisCarteiraExcluidos,
  });
}
