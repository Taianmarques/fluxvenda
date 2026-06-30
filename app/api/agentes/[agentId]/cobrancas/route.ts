import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig, getAgentConfigAsManager } from "@/lib/team";
import { createAsaasCustomer, createAsaasCharge } from "@/lib/asaas";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) return NextResponse.json({ cobrancas: [] });

  const cobrancas = await prisma.cobranca.findMany({
    where: { agentConfigId: agentId },
    orderBy: { vencimento: "asc" },
  });
  return NextResponse.json({ cobrancas });
}

const OFFSETS: Record<string, number> = {
  SEMANAL: 7, QUINZENAL: 14, MENSAL: 30, ANUAL: 365,
};

const schema = z.object({
  nomeDevedor: z.string().min(1),
  contactNumber: z.string().min(8),
  cpfCnpj: z.string().default(""),
  valor: z.number().min(0.01),
  descricao: z.string().default(""),
  vencimento: z.string(), // ISO date string
  recorrencia: z.enum(["UNICA", "SEMANAL", "QUINZENAL", "MENSAL", "ANUAL"]).default("UNICA"),
  numeroParcelas: z.number().int().min(1).max(60).default(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { nomeDevedor, contactNumber, cpfCnpj, valor, descricao, recorrencia, numeroParcelas } = body.data;
  const firstDue = new Date(body.data.vencimento);

  // Gera todas as ocorrências da recorrência
  const ocorrencias: Date[] = [firstDue];
  if (recorrencia !== "UNICA") {
    const days = OFFSETS[recorrencia] ?? 30;
    for (let i = 1; i < numeroParcelas; i++) {
      const next = new Date(firstDue);
      if (recorrencia === "MENSAL") {
        next.setMonth(next.getMonth() + i);
      } else if (recorrencia === "ANUAL") {
        next.setFullYear(next.getFullYear() + i);
      } else {
        next.setDate(next.getDate() + days * i);
      }
      ocorrencias.push(next);
    }
  }

  const created = await prisma.$transaction(
    ocorrencias.map(v => prisma.cobranca.create({
      data: { agentConfigId: agentId, nomeDevedor, contactNumber, cpfCnpj: cpfCnpj || null, valor, descricao, vencimento: v, recorrencia },
    }))
  );

  // Envia o boleto da primeira ocorrência imediatamente (se tiver API key + WhatsApp)
  const primeira = created[0];
  if (config.asaasApiKey && config.uazapiToken) {
    try {
      const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, nomeDevedor, contactNumber, cpfCnpj || "00000000000");
      const payment = await createAsaasCharge(config.asaasApiKey, config.asaasSandbox, customer.id, valor, descricao || `Cobrança ${nomeDevedor}`, "BOLETO", undefined, firstDue.toISOString().slice(0, 10));
      await prisma.cobranca.update({
        where: { id: primeira.id },
        data: { status: "BOLETO_GERADO", asaasCustomerId: customer.id, asaasPaymentId: payment.id, boletoUrl: payment.bankSlipUrl ?? null },
      });
      const msg = `Olá ${nomeDevedor}! Segue o boleto de R$ ${valor.toFixed(2)} com vencimento em ${firstDue.toLocaleDateString("pt-BR")}:\n${payment.bankSlipUrl ?? payment.invoiceUrl}`;
      await sendWhatsAppTextAsTeam(config.uazapiToken, contactNumber, msg);
    } catch (err) {
      console.error("[cobrancas] erro ao gerar boleto na criação:", err);
    }
  }

  return NextResponse.json({ cobrancas: created });
}
