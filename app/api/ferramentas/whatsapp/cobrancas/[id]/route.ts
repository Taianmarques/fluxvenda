import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { createAsaasCustomer, createAsaasCharge, cancelAsaasCharge } from "@/lib/asaas";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PAGO", "CANCELADA"]).optional(),
  enviarAgora: z.boolean().optional(), // força envio/reenvio do boleto
  novaData: z.string().optional(),    // prorrogar: cancela boleto atual e emite nova via
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cobranca = await prisma.cobranca.findUnique({ where: { id } });
  if (!cobranca || !(await userBelongsToAgentConfig(userId, cobranca.agentConfigId))) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (body.data.status) {
    const updated = await prisma.cobranca.update({
      where: { id },
      data: { status: body.data.status, ...(body.data.status === "PAGO" ? { paidAt: new Date() } : {}) },
    });
    return NextResponse.json({ cobranca: updated });
  }

  if (body.data.enviarAgora) {
    const config = await prisma.agentConfig.findUnique({ where: { id: cobranca.agentConfigId } });
    if (!config?.asaasApiKey || !config?.uazapiToken) {
      return NextResponse.json({ error: "Asaas não configurado" }, { status: 400 });
    }
    try {
      let { asaasCustomerId, asaasPaymentId, boletoUrl } = cobranca;
      if (!asaasPaymentId) {
        if (!asaasCustomerId) {
          const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, cobranca.nomeDevedor, cobranca.contactNumber, cobranca.cpfCnpj || "00000000000");
          asaasCustomerId = customer.id;
        }
        const payment = await createAsaasCharge(config.asaasApiKey, config.asaasSandbox, asaasCustomerId, cobranca.valor, cobranca.descricao || `Cobrança ${cobranca.nomeDevedor}`, "BOLETO", undefined, cobranca.vencimento.toISOString().slice(0, 10));
        asaasPaymentId = payment.id;
        boletoUrl = payment.bankSlipUrl ?? null;
        await prisma.cobranca.update({ where: { id }, data: { status: "BOLETO_GERADO", asaasCustomerId, asaasPaymentId, boletoUrl } });
      }
      const msg = `Olá ${cobranca.nomeDevedor}! Segue o boleto de R$ ${cobranca.valor.toFixed(2)} com vencimento em ${cobranca.vencimento.toLocaleDateString("pt-BR")}:\n${boletoUrl ?? "Link não disponível"}`;
      await sendWhatsAppTextAsTeam(config.uazapiToken, cobranca.contactNumber, msg);
      const updated = await prisma.cobranca.findUnique({ where: { id } });
      return NextResponse.json({ cobranca: updated });
    } catch (err) {
      console.error("[cobrancas/[id]] erro ao enviar boleto:", err);
      return NextResponse.json({ error: "Não foi possível gerar/enviar o boleto" }, { status: 500 });
    }
  }

  if (body.data.novaData) {
    const novaData = body.data.novaData;
    const config = await prisma.agentConfig.findUnique({ where: { id: cobranca.agentConfigId } });
    if (!config?.asaasApiKey) return NextResponse.json({ error: "Asaas não configurado" }, { status: 400 });
    try {
      if (cobranca.asaasPaymentId) {
        await cancelAsaasCharge(config.asaasApiKey, config.asaasSandbox, cobranca.asaasPaymentId);
      }
      let { asaasCustomerId } = cobranca;
      if (!asaasCustomerId) {
        const customer = await createAsaasCustomer(config.asaasApiKey, config.asaasSandbox, cobranca.nomeDevedor, cobranca.contactNumber, cobranca.cpfCnpj || "00000000000");
        asaasCustomerId = customer.id;
      }
      const payment = await createAsaasCharge(config.asaasApiKey, config.asaasSandbox, asaasCustomerId, cobranca.valor, cobranca.descricao || `Cobrança ${cobranca.nomeDevedor}`, "BOLETO", undefined, novaData);
      const boletoUrl = payment.bankSlipUrl ?? null;
      const updated = await prisma.cobranca.update({
        where: { id },
        data: { vencimento: new Date(novaData), status: "BOLETO_GERADO", asaasCustomerId, asaasPaymentId: payment.id, boletoUrl, reminderCount: 0, lastReminderAt: null },
      });
      if (config.uazapiToken && boletoUrl) {
        await sendWhatsAppTextAsTeam(config.uazapiToken, cobranca.contactNumber, `Segunda via com novo vencimento em ${new Date(novaData).toLocaleDateString("pt-BR")}. Valor: R$ ${cobranca.valor.toFixed(2)}.\n${boletoUrl}`).catch(() => {});
      }
      return NextResponse.json({ cobranca: updated });
    } catch (err) {
      console.error("[cobrancas/[id]] erro ao prorrogar:", err);
      return NextResponse.json({ error: "Não foi possível prorrogar o boleto" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Nenhuma ação especificada" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cobranca = await prisma.cobranca.findUnique({ where: { id } });
  if (!cobranca || !(await userBelongsToAgentConfig(userId, cobranca.agentConfigId))) {
    return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
  }

  await prisma.cobranca.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
