import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole, negadaParaAtendente } from "@/lib/team";
import { emitChatEvent } from "@/lib/realtime";
import { normalizePhoneBR } from "@/lib/phone";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      // Últimas 100 mensagens (desc + take + reverse) — o polling de 3s do chat não pode
      // carregar o histórico inteiro de conversas longas a cada tick
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          sender: { select: { name: true } },
          replyTo: { select: { id: true, content: true, role: true, mediaType: true, sender: { select: { name: true } } } },
        },
      },
      opportunities: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  conversation.messages.reverse(); // devolve em ordem cronológica

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config, isManager } = result;
  if (!isManager && negadaParaAtendente(conversation, userId, config.iaLeadAttendantId)) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  // Abrir a conversa marca como lida pra todo mundo (não é por usuário) — usado no filtro
  // "não lidas". Throttle de 30s: o polling de 3s não precisa escrever no banco toda vez.
  if (!conversation.lastReadAt || conversation.lastReadAt < new Date(Date.now() - 30_000)) {
    await prisma.conversation.update({ where: { id }, data: { lastReadAt: new Date() } });
  }

  return NextResponse.json({ conversation });
}

const patchSchema = z.object({
  leadStatusId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["ATIVO", "AGUARDANDO", "FINALIZADO"]).optional(),
  motivoEncerramento: z.string().max(200).optional(), // enviado junto com status FINALIZADO
  contactName: z.string().trim().min(1).max(80).optional(), // salvar/renomear o contato
  contactNumber: z.string().trim().transform(v => normalizePhoneBR(v)).refine(v => v.length >= 10 && v.length <= 13, { message: "Número inválido — use DDD + número" }).optional(),
  pinned: z.boolean().optional(),
  groupVisibleToIds: z.array(z.string()).max(200).optional(), // só grupo, só gestor — ver checagem abaixo
});

// Muda o status do lead, o status da conversa e/ou o atendente responsável.
// Etapa do pipeline e valor negociado agora vivem em Opportunity, não aqui.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const result = await getAgentConfigWithRole(userId, conversation.agentConfigId);
  if (!result) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  const { config, isManager } = result;
  if (!isManager && negadaParaAtendente(conversation, userId, config.iaLeadAttendantId)) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  if (body.data.leadStatusId) {
    const status = await prisma.leadStatus.findFirst({ where: { id: body.data.leadStatusId, agentConfigId: config.id } });
    if (!status) return NextResponse.json({ error: "Status não encontrado" }, { status: 404 });
  }

  // Transferir: qualquer pessoa da equipe (gestor ou atendente) pode passar a conversa pra
  // outro membro válido da mesma equipe — só valida que o destino realmente faz parte dela.
  if (body.data.assignedToId) {
    const member = await prisma.teamMember.findUnique({ where: { profileId: body.data.assignedToId } });
    const team = await prisma.team.findUnique({ where: { id: config.teamId } });
    const isThatProfileManager = team?.managerId === body.data.assignedToId;
    if ((!member || member.teamId !== config.teamId) && !isThatProfileManager) {
      return NextResponse.json({ error: "Atendente não encontrado" }, { status: 404 });
    }
  }

  // Quem pode ver o grupo: só o gestor configura, e só faz sentido pra conversa de grupo. Valida
  // que cada id realmente pertence à equipe (atendente ou o próprio gestor) — evita salvar um
  // profileId de fora.
  if (body.data.groupVisibleToIds !== undefined) {
    if (!isManager) return NextResponse.json({ error: "Só o gestor configura quem vê o grupo" }, { status: 403 });
    if (!conversation.isGroup) return NextResponse.json({ error: "Essa configuração é só pra conversas de grupo" }, { status: 400 });
    if (body.data.groupVisibleToIds.length > 0) {
      const team = await prisma.team.findUnique({ where: { id: config.teamId } });
      const membros = await prisma.teamMember.findMany({ where: { teamId: config.teamId }, select: { profileId: true } });
      const idsValidos = new Set([team?.managerId, ...membros.map(m => m.profileId)].filter(Boolean));
      const invalido = body.data.groupVisibleToIds.some(pid => !idsValidos.has(pid));
      if (invalido) return NextResponse.json({ error: "Atendente não encontrado" }, { status: 404 });
    }
  }

  // Só valida/atualiza se realmente mudou — evita 409 falso quando o número enviado é o mesmo
  if (body.data.contactNumber !== undefined && body.data.contactNumber !== conversation.contactNumber) {
    const conflito = await prisma.conversation.findFirst({
      where: { agentConfigId: conversation.agentConfigId, contactNumber: body.data.contactNumber, id: { not: id } },
      select: { id: true },
    });
    if (conflito) return NextResponse.json({ error: "Já existe outro contato com esse número" }, { status: 409 });
  }

  const encerrando = body.data.status === "FINALIZADO";
  const reabrindo = body.data.status !== undefined && body.data.status !== "FINALIZADO" && conversation.status === "FINALIZADO";
  // Encerrar uma conversa sem atendente (ex: IA cuidou sozinha, ninguém "aceitou" antes de
  // fechar) reivindica ela pra quem encerrou — senão ela vira órfã: some da visão de todo mundo
  // que não é gestor (ver negadaParaAtendente acima), sem ninguém dono pra reabrir se precisar.
  const assumirAoEncerrar = encerrando && !conversation.assignedToId && body.data.assignedToId === undefined;
  const novoAssignedToId = assumirAoEncerrar ? userId : body.data.assignedToId;
  const assignedToIdMudou = novoAssignedToId !== undefined && novoAssignedToId !== conversation.assignedToId;

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(body.data.leadStatusId !== undefined && { leadStatusId: body.data.leadStatusId }),
      ...(body.data.assignedToId !== undefined && { assignedToId: body.data.assignedToId }),
      ...(assumirAoEncerrar && { assignedToId: novoAssignedToId }),
      ...(body.data.status !== undefined && { status: body.data.status }),
      ...(body.data.contactName !== undefined && { contactName: body.data.contactName }),
      ...(body.data.contactNumber !== undefined && { contactNumber: body.data.contactNumber }),
      ...(body.data.pinned !== undefined && { pinned: body.data.pinned }),
      ...(body.data.groupVisibleToIds !== undefined && { groupVisibleToIds: body.data.groupVisibleToIds }),
      ...(encerrando && { motivoEncerramento: body.data.motivoEncerramento ?? null, encerradaEm: new Date() }),
      ...(reabrindo && { motivoEncerramento: null, encerradaEm: null }),
    },
  });

  // Registra o motivo no histórico da conversa (auditoria)
  if (encerrando && body.data.motivoEncerramento) {
    await prisma.message.create({
      data: { conversationId: id, role: "note", content: `Atendimento encerrado — motivo: ${body.data.motivoEncerramento}.` },
    });
  }

  // Log de transferência — vira um banner de sistema na conversa (não é mensagem enviada ao
  // cliente). Prefixo "TRANSFER:" avisa o front pra renderizar diferente da nota interna comum.
  if (assignedToIdMudou) {
    const ids = [conversation.assignedToId, novoAssignedToId].filter((v): v is string => Boolean(v));
    const perfis = ids.length > 0 ? await prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nomePorId = new Map(perfis.map(p => [p.id, p.name]));
    const nomeAntigo = conversation.assignedToId ? (nomePorId.get(conversation.assignedToId) ?? "atendente removido") : null;
    const nomeNovo = novoAssignedToId ? (nomePorId.get(novoAssignedToId) ?? "atendente removido") : null;
    const agora = new Date();
    const quando = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const texto = nomeAntigo && nomeNovo
      ? `Atendimento transferido de ${nomeAntigo} para ${nomeNovo} em ${quando}`
      : nomeNovo
        ? `Atendimento atribuído a ${nomeNovo} em ${quando}`
        : `Atendimento ficou sem atendente em ${quando}`;

    await prisma.message.create({ data: { conversationId: id, role: "note", content: `TRANSFER: ${texto}` } });
  }

  emitChatEvent(conversation.agentConfigId, id); // atribuição/status/pin somem ou aparecem na lista dos colegas na hora

  return NextResponse.json({ conversation: updated });
}
