import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { createAsaasCustomer, createAsaasCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { getCrmPlanTier } from "@/lib/crm-plans";
import { z } from "zod";

const schema = z.object({
  tierId: z.string().min(1),
  formaPagamento: z.enum(["PIX", "CARTAO"]),
  cpfCnpj: z.string().min(11).max(18),
});

// Plano do CRM é cobrado pela conta Asaas DA PRÓPRIA PLATAFORMA — mesmo padrão de
// app/api/creditos/checkout, só que grava PlanPurchase em vez de CreditoCompra.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ASAAS_PLATFORM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis. Tente novamente em breve." }, { status: 503 });
  const sandbox = process.env.ASAAS_PLATFORM_SANDBOX !== "false";

  const team = await prisma.team.findUnique({ where: { managerId: userId }, include: { manager: true } });
  if (!team) return NextResponse.json({ error: "Só o gestor da equipe pode atualizar o plano" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Preencha o CPF/CNPJ e a forma de pagamento." }, { status: 400 });

  const tier = getCrmPlanTier(body.data.tierId);
  if (!tier) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

  const cpfCnpj = body.data.cpfCnpj.replace(/\D/g, "");

  try {
    let asaasCustomerId = team.asaasCustomerId;
    if (!asaasCustomerId) {
      const customer = await createAsaasCustomer(
        apiKey, sandbox,
        team.manager.name || team.name,
        team.manager.phone || "",
        cpfCnpj
      );
      asaasCustomerId = customer.id;
      await prisma.team.update({ where: { id: team.id }, data: { asaasCustomerId } });
    }

    const valor = tier.valorCentavos / 100;
    const billingType = body.data.formaPagamento === "PIX" ? "PIX" : "CREDIT_CARD";
    const payment = await createAsaasCharge(
      apiKey, sandbox, asaasCustomerId, valor,
      `Plano ${tier.label} — FluxVenda CRM (mensal)`,
      billingType
    );

    let pixPayload: string | undefined;
    if (body.data.formaPagamento === "PIX") {
      const qr = await getAsaasPixQrCode(apiKey, sandbox, payment.id);
      pixPayload = qr.payload;
    }

    const compra = await prisma.planPurchase.create({
      data: {
        teamId: team.id,
        tier: tier.id,
        valorCentavos: tier.valorCentavos,
        formaPagamento: body.data.formaPagamento,
        cpfCnpj,
        asaasPaymentId: payment.id,
        asaasInvoiceUrl: payment.invoiceUrl,
        asaasPixPayload: pixPayload ?? null,
        status: "PENDENTE",
      },
    });

    return NextResponse.json({
      compraId: compra.id,
      formaPagamento: body.data.formaPagamento,
      invoiceUrl: payment.invoiceUrl,
      pixPayload,
    });
  } catch (err: any) {
    console.error("[planos-checkout]", err);
    return NextResponse.json({ error: "Não foi possível gerar a cobrança agora. Tente novamente." }, { status: 502 });
  }
}
