import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

export const audienciaSchema = z.object({
  compradores: z.enum(["todos", "sim", "nao"]).default("todos"),
  inatividade: z.enum(["qualquer", "7d", "30d", "60d"]).default("qualquer"),
});

export async function resolverAudiencia(agentConfigId: string, filtros: z.infer<typeof audienciaSchema>) {
  const dias = { qualquer: null, "7d": 7, "30d": 30, "60d": 60 }[filtros.inatividade];
  const cutoff = dias ? new Date(Date.now() - dias * 86400000) : null;

  const conversas = await prisma.conversation.findMany({
    where: {
      agentConfigId,
      contactNumber: { not: { startsWith: "ig_" } }, // só WhatsApp
      ...(cutoff ? { updatedAt: { lte: cutoff } } : {}),
    },
    select: { contactNumber: true, contactName: true },
    orderBy: { updatedAt: "desc" },
  });

  // Dedup por número (mantém o nome mais recente)
  const porNumero = new Map<string, string>();
  for (const c of conversas) {
    if (!porNumero.has(c.contactNumber)) porNumero.set(c.contactNumber, c.contactName ?? "");
  }

  if (filtros.compradores !== "todos") {
    const [orders, cobrancas] = await Promise.all([
      prisma.order.findMany({ where: { agentConfigId, status: "PAGO" }, select: { contactNumber: true } }),
      prisma.cobranca.findMany({ where: { agentConfigId, status: "PAGO" }, select: { contactNumber: true } }),
    ]);
    const compraram = new Set([...orders.map(o => o.contactNumber), ...cobrancas.map(c => c.contactNumber)]);
    for (const numero of Array.from(porNumero.keys())) {
      const comprou = compraram.has(numero);
      if (filtros.compradores === "sim" && !comprou) porNumero.delete(numero);
      if (filtros.compradores === "nao" && comprou) porNumero.delete(numero);
    }
  }

  return Array.from(porNumero.entries())
    .slice(0, 500) // teto de segurança por campanha
    .map(([contactNumber, contactName]) => ({ contactNumber, contactName }));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ campanhas: [] });

  const campanhas = await prisma.campanha.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      destinatarios: { select: { status: true } },
    },
  });

  return NextResponse.json({
    campanhas: campanhas.map(c => ({
      id: c.id,
      nome: c.nome,
      modo: c.modo,
      status: c.status,
      mensagem: c.mensagem,
      createdAt: c.createdAt.toISOString(),
      total: c.destinatarios.length,
      enviados: c.destinatarios.filter(d => d.status === "ENVIADO").length,
      erros: c.destinatarios.filter(d => d.status === "ERRO").length,
    })),
  });
}

const criarSchema = z.object({
  nome: z.string().min(1).max(60),
  mensagem: z.string().min(1).max(2000),
  modo: z.enum(["NORMAL", "IA_VARIACAO"]).default("NORMAL"),
  instrucoesIA: z.string().max(500).default(""),
  ritmo: z.enum(["seguro", "moderado", "rapido"]).default("seguro"),
  filtros: audienciaSchema,
});

const RITMOS = {
  seguro: { min: 60, max: 180 },
  moderado: { min: 30, max: 90 },
  rapido: { min: 15, max: 45 },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Só o gestor cria campanhas" }, { status: 403 });
  if (!config.uazapiToken) return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 });

  const body = criarSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const destinatarios = await resolverAudiencia(agentId, body.data.filtros);
  if (destinatarios.length === 0) {
    return NextResponse.json({ error: "Nenhum destinatário para esses filtros." }, { status: 400 });
  }

  const ritmo = RITMOS[body.data.ritmo];
  const campanha = await prisma.campanha.create({
    data: {
      agentConfigId: agentId,
      nome: body.data.nome,
      mensagem: body.data.mensagem,
      modo: body.data.modo,
      instrucoesIA: body.data.instrucoesIA,
      intervaloMinSeg: ritmo.min,
      intervaloMaxSeg: ritmo.max,
      nextSendAt: new Date(),
      destinatarios: { createMany: { data: destinatarios } },
    },
  });

  return NextResponse.json({ campanha: { id: campanha.id, total: destinatarios.length } });
}
