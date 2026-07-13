import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  contatos: z.array(z.object({
    nome: z.string().trim().max(80).optional(),
    numero: z.string().transform(v => v.replace(/\D/g, "")),
  })).min(1).max(1000),
});

// Importa contatos em massa (CSV parseado no cliente). Cada contato vira uma conversa sem
// mensagens — mesmo modelo dos contatos que chegam pelo WhatsApp. Número que já existe:
// só preenche o nome se ainda estiver vazio, nunca sobrescreve.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config } = result;

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Dedup interno + descarta números inválidos
  const porNumero = new Map<string, { nome?: string; numero: string }>();
  for (const c of body.data.contatos) {
    if (c.numero.length < 10 || c.numero.length > 13) continue;
    if (!porNumero.has(c.numero)) porNumero.set(c.numero, c);
  }
  const validos = Array.from(porNumero.values());
  const ignorados = body.data.contatos.length - validos.length;
  if (validos.length === 0) {
    return NextResponse.json({ error: "Nenhum número válido no arquivo (use DDD + número)" }, { status: 400 });
  }

  const existentes = await prisma.conversation.findMany({
    where: { agentConfigId: config.id, contactNumber: { in: validos.map(v => v.numero) } },
    select: { id: true, contactNumber: true, contactName: true },
  });
  const existentesPorNumero = new Map(existentes.map(e => [e.contactNumber, e]));

  const novos = validos.filter(v => !existentesPorNumero.has(v.numero));
  await prisma.conversation.createMany({
    data: novos.map(v => ({
      agentConfigId: config.id,
      contactNumber: v.numero,
      contactName: v.nome?.trim() || null,
    })),
  });

  let atualizados = 0;
  for (const v of validos) {
    const existente = existentesPorNumero.get(v.numero);
    if (existente && !existente.contactName && v.nome?.trim()) {
      await prisma.conversation.update({ where: { id: existente.id }, data: { contactName: v.nome.trim() } });
      atualizados++;
    }
  }

  return NextResponse.json({ criados: novos.length, atualizados, ignorados });
}

const acaoSchema = z.object({
  conversationIds: z.array(z.string()).min(1).max(500),
  acao: z.enum(["vincular_atendente", "aplicar_etiqueta", "remover_etiqueta"]),
  atendenteId: z.string().nullable().optional(), // vincular_atendente (null = remover vínculo)
  etiquetaId: z.string().optional(),             // aplicar/remover_etiqueta
});

// Ações em massa nos contatos selecionados: vincular atendente padrão ou aplicar/remover etiqueta
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  const { config } = result;

  const body = acaoSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Só conversas desse agente — ids de outro tenant são descartados silenciosamente
  const conversas = await prisma.conversation.findMany({
    where: { id: { in: body.data.conversationIds }, agentConfigId: config.id },
    select: { id: true },
  });
  const ids = conversas.map(c => c.id);
  if (ids.length === 0) return NextResponse.json({ error: "Nenhum contato válido" }, { status: 400 });

  if (body.data.acao === "vincular_atendente") {
    if (body.data.atendenteId) {
      const team = await prisma.team.findUnique({ where: { id: config.teamId } });
      const member = await prisma.teamMember.findUnique({ where: { profileId: body.data.atendenteId } });
      const pertence = team?.managerId === body.data.atendenteId || member?.teamId === config.teamId;
      if (!pertence) return NextResponse.json({ error: "Atendente não encontrado" }, { status: 404 });
    }
    await prisma.conversation.updateMany({
      where: { id: { in: ids } },
      data: { assignedToId: body.data.atendenteId ?? null },
    });
    return NextResponse.json({ ok: true, afetados: ids.length });
  }

  // aplicar/remover etiqueta
  if (!body.data.etiquetaId) return NextResponse.json({ error: "Etiqueta obrigatória" }, { status: 400 });
  const etiqueta = await prisma.etiqueta.findFirst({ where: { id: body.data.etiquetaId, agentConfigId: config.id } });
  if (!etiqueta) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });

  const op = body.data.acao === "aplicar_etiqueta"
    ? { connect: ids.map(id => ({ id })) }
    : { disconnect: ids.map(id => ({ id })) };
  await prisma.etiqueta.update({ where: { id: etiqueta.id }, data: { conversations: op } });

  return NextResponse.json({ ok: true, afetados: ids.length });
}
