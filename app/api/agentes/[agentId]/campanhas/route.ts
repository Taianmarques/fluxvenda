import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { calcularNiveis, type Nivel } from "@/lib/carteira-nivel";
import { z } from "zod";

export const audienciaSchema = z.object({
  compradores: z.enum(["todos", "sim", "nao"]).default("todos"),
  inatividade: z.enum(["qualquer", "7d", "30d", "60d"]).default("qualquer"),
  stageId: z.string().nullable().default(null), // etapa do pipeline em que o lead está agora
  nivel: z.enum(["A", "B", "C", "INATIVO", "PERDIDO", "PROSPECTO"]).nullable().default(null), // nível da carteira
  atendenteId: z.string().nullable().default(null), // carteira de um vendedor específico (assignedToId)
});

export async function resolverAudiencia(agentConfigId: string, filtros: z.infer<typeof audienciaSchema>) {
  const dias = { qualquer: null, "7d": 7, "30d": 30, "60d": 60 }[filtros.inatividade];
  const cutoff = dias ? new Date(Date.now() - dias * 86400000) : null;

  const conversas = await prisma.conversation.findMany({
    where: {
      agentConfigId,
      contactNumber: { not: { startsWith: "ig_" } }, // só WhatsApp
      ...(cutoff ? { updatedAt: { lte: cutoff } } : {}),
      ...(filtros.atendenteId ? { assignedToId: filtros.atendenteId } : {}),
      ...(filtros.stageId ? { opportunities: { some: { stageId: filtros.stageId, wonAt: null } } } : {}),
    },
    select: { contactNumber: true, contactName: true, nivelCarteira: true },
    orderBy: { updatedAt: "desc" },
  });

  // Dedup por número (mantém o nome/nível mais recente)
  const porNumero = new Map<string, { contactName: string; nivelManual: string | null }>();
  for (const c of conversas) {
    if (!porNumero.has(c.contactNumber)) porNumero.set(c.contactNumber, { contactName: c.contactName ?? "", nivelManual: c.nivelCarteira });
  }

  if (filtros.compradores !== "todos" || filtros.nivel) {
    const [orders, cobrancas, opportunities] = await Promise.all([
      prisma.order.findMany({ where: { agentConfigId, status: "PAGO" }, select: { contactNumber: true, total: true, deliveryFee: true, paidAt: true } }),
      prisma.cobranca.findMany({ where: { agentConfigId, status: "PAGO" }, select: { contactNumber: true, valor: true, paidAt: true } }),
      filtros.nivel
        ? prisma.opportunity.findMany({
            where: { conversation: { agentConfigId }, wonAt: { not: null } },
            select: { conversation: { select: { contactNumber: true } }, dealValue: true, wonAt: true },
          })
        : Promise.resolve([]),
    ]);
    const compraram = new Set([...orders.map(o => o.contactNumber), ...cobrancas.map(c => c.contactNumber)]);

    if (filtros.compradores !== "todos") {
      for (const numero of Array.from(porNumero.keys())) {
        const comprou = compraram.has(numero);
        if (filtros.compradores === "sim" && !comprou) porNumero.delete(numero);
        if (filtros.compradores === "nao" && comprou) porNumero.delete(numero);
      }
    }

    if (filtros.nivel) {
      const config = await prisma.agentConfig.findUnique({ where: { id: agentConfigId }, select: { carteiraInativoDias: true } });
      const comprasPorContato = new Map<string, { at: Date; valor: number }[]>();
      const addCompra = (numero: string, at: Date | null, valor: number) => {
        if (!at) return;
        if (!comprasPorContato.has(numero)) comprasPorContato.set(numero, []);
        comprasPorContato.get(numero)!.push({ at, valor });
      };
      for (const o of orders) addCompra(o.contactNumber, o.paidAt, o.total + o.deliveryFee);
      for (const c of cobrancas) addCompra(c.contactNumber, c.paidAt, c.valor);
      for (const o of opportunities) addCompra(o.conversation.contactNumber, o.wonAt, o.dealValue);

      const clientes = Array.from(porNumero.entries()).map(([contactNumber, info]) => ({
        contactNumber,
        nivelManual: info.nivelManual,
        compras: comprasPorContato.get(contactNumber) ?? [],
      }));
      const niveis = calcularNiveis(clientes, config?.carteiraInativoDias ?? 60);

      for (const numero of Array.from(porNumero.keys())) {
        if (niveis.get(numero) !== (filtros.nivel as Nivel)) porNumero.delete(numero);
      }
    }
  }

  return Array.from(porNumero.entries())
    .slice(0, 500) // teto de segurança por campanha
    .map(([contactNumber, info]) => ({ contactNumber, contactName: info.contactName }));
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
  // Fonte do público: filtros do CRM OU uma lista importada de planilha (mutuamente exclusivos)
  filtros: audienciaSchema.optional(),
  contatosImportados: z.array(z.object({
    contactNumber: z.string().min(8).max(20),
    contactName: z.string().max(120).default(""),
  })).max(500).optional(),
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

  let destinatarios: { contactNumber: string; contactName: string }[];
  if (body.data.contatosImportados && body.data.contatosImportados.length > 0) {
    // Planilha importada: normaliza e deduplica por número (sem acrescentar DDI —
    // sendWhatsAppTextAsTeam já normaliza na hora do envio)
    const porNumero = new Map<string, string>();
    for (const c of body.data.contatosImportados) {
      const digits = c.contactNumber.replace(/\D/g, "");
      if (digits.length < 8) continue;
      if (!porNumero.has(digits)) porNumero.set(digits, c.contactName.trim());
    }
    destinatarios = Array.from(porNumero.entries()).slice(0, 500).map(([contactNumber, contactName]) => ({ contactNumber, contactName }));
  } else {
    destinatarios = await resolverAudiencia(agentId, audienciaSchema.parse(body.data.filtros ?? {}));
  }

  if (destinatarios.length === 0) {
    return NextResponse.json({ error: "Nenhum destinatário encontrado para essa audiência." }, { status: 400 });
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
