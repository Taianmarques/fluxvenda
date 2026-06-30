import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { createAsaasCustomer, createAsaasCharge } from "@/lib/asaas";

// Dias relativos ao vencimento em que lembretes são enviados (positivo = antes, negativo = depois)
const REMINDER_DAYS = [3, 0, -3, -7];

function daysDiff(now: Date, target: Date): number {
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.agentConfig.findMany({
    where: { active: true, cobrancaEnabled: true, uazapiToken: { not: null }, asaasApiKey: { not: null } },
  });

  let sent = 0;
  let updated = 0;

  for (const config of configs) {
    const cobrancas = await prisma.cobranca.findMany({
      where: { agentConfigId: config.id, status: { in: ["PENDENTE", "BOLETO_GERADO"] } },
    });

    const now = new Date();

    for (const c of cobrancas) {
      const dias = daysDiff(now, c.vencimento);

      // Marca VENCIDA se mais de 30 dias após o vencimento sem pagamento
      if (dias < -30) {
        await prisma.cobranca.update({ where: { id: c.id }, data: { status: "VENCIDA" } });
        updated++;
        continue;
      }

      if (c.status === "PENDENTE" && dias <= 3) {
        // Primeira janela atingida (3 dias antes) — gera e envia boleto
        try {
          let asaasCustomerId = c.asaasCustomerId;
          if (!asaasCustomerId) {
            const customer = await createAsaasCustomer(config.asaasApiKey!, config.asaasSandbox, c.nomeDevedor, c.contactNumber, c.cpfCnpj || "00000000000");
            asaasCustomerId = customer.id;
          }
          const payment = await createAsaasCharge(config.asaasApiKey!, config.asaasSandbox, asaasCustomerId, c.valor, c.descricao || `Cobrança ${c.nomeDevedor}`, "BOLETO", undefined, c.vencimento.toISOString().slice(0, 10));
          const boletoUrl = payment.bankSlipUrl ?? payment.invoiceUrl;
          await prisma.cobranca.update({
            where: { id: c.id },
            data: { status: "BOLETO_GERADO", asaasCustomerId, asaasPaymentId: payment.id, boletoUrl, reminderCount: 1, lastReminderAt: now },
          });
          const msg = `Olá ${c.nomeDevedor}! Segue o boleto de R$ ${c.valor.toFixed(2)} com vencimento em ${c.vencimento.toLocaleDateString("pt-BR")}:\n${boletoUrl}`;
          await sendWhatsAppTextAsTeam(config.uazapiToken!, c.contactNumber, msg);
          sent++;
        } catch (err) {
          console.error("[cron/cobranca] erro ao gerar boleto:", err);
        }
        continue;
      }

      if (c.status === "BOLETO_GERADO" && c.boletoUrl) {
        // Verifica se é hora de enviar um lembrete com base em REMINDER_DAYS
        const reminderIndex = REMINDER_DAYS.findIndex(d => Math.abs(dias - d) <= 0.5 && c.reminderCount <= REMINDER_DAYS.indexOf(d));
        if (reminderIndex < 0) continue;
        // Evita reenvio no mesmo dia
        if (c.lastReminderAt && daysDiff(c.lastReminderAt, now) < 1) continue;

        const vencido = dias < 0;
        const msg = vencido
          ? `Olá ${c.nomeDevedor}! Seu boleto de R$ ${c.valor.toFixed(2)} venceu há ${Math.abs(dias)} dia(s). Regularize para evitar juros adicionais:\n${c.boletoUrl}`
          : `Olá ${c.nomeDevedor}! Lembrete: seu boleto de R$ ${c.valor.toFixed(2)} vence em ${dias === 0 ? "hoje" : `${dias} dia(s)`}:\n${c.boletoUrl}`;

        try {
          await sendWhatsAppTextAsTeam(config.uazapiToken!, c.contactNumber, msg);
          await prisma.cobranca.update({ where: { id: c.id }, data: { reminderCount: { increment: 1 }, lastReminderAt: now } });
          sent++;
        } catch (err) {
          console.error("[cron/cobranca] erro ao enviar lembrete:", err);
        }
      }
    }
  }

  return NextResponse.json({ configs: configs.length, sent, updated });
}
