import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createAsaasCustomer, createAsaasCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { getCreditPack } from "@/lib/credits";
import { z } from "zod";

const schema = z.object({
  packId: z.string().min(1),
  formaPagamento: z.enum(["PIX", "CARTAO"]),
  cpfCnpj: z.string().min(11).max(18),
});

// Créditos de IA são cobrados pela conta Asaas DA PRÓPRIA PLATAFORMA — não pela conta que
// cada cliente conecta no agente dele (essa serve pra ele cobrar OS CLIENTES DELE).
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ASAAS_PLATFORM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis. Tente novamente em breve." }, { status: 503 });
  const sandbox = process.env.ASAAS_PLATFORM_SANDBOX !== "false";

  const team = await prisma.team.findUnique({ where: { managerId: userId }, include: { manager: true } });
  if (!team) return NextResponse.json({ error: "Só o gestor da equipe compra créditos" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Preencha o CPF/CNPJ e a forma de pagamento." }, { status: 400 });

  const pack = getCreditPack(body.data.packId);
  if (!pack) return NextResponse.json({ error: "Pacote inválido" }, { status: 400 });

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

    const valor = pack.valorCentavos / 100;
    const billingType = body.data.formaPagamento === "PIX" ? "PIX" : "CREDIT_CARD";
    const payment = await createAsaasCharge(
      apiKey, sandbox, asaasCustomerId, valor,
      `Créditos de IA — ${pack.tokens.toLocaleString("pt-BR")} tokens (FluxVenda)`,
      billingType
    );

    let pixPayload: string | undefined;
    if (body.data.formaPagamento === "PIX") {
      const qr = await getAsaasPixQrCode(apiKey, sandbox, payment.id);
      pixPayload = qr.payload;
    }

    const compra = await prisma.creditoCompra.create({
      data: {
        teamId: team.id,
        packId: pack.id,
        tokens: pack.tokens,
        valorCentavos: pack.valorCentavos,
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
    console.error("[creditos-checkout]", err);
    return NextResponse.json({ error: "Não foi possível gerar a cobrança agora. Tente novamente." }, { status: 502 });
  }
}
