import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { createAsaasCustomer, createAsaasCharge, createAsaasCardCharge, getAsaasPixQrCode } from "@/lib/asaas";
import { getCreditPack } from "@/lib/credits";
import { z } from "zod";

const schema = z.object({
  packId: z.string().min(1),
  formaPagamento: z.enum(["PIX", "CARTAO"]),
  cpfCnpj: z.string().min(11).max(18),
  cartao: z.object({
    holderName: z.string().min(3),
    number: z.string().min(13),
    expiryMonth: z.string().length(2),
    expiryYear: z.string().length(2),
    ccv: z.string().min(3),
    postalCode: z.string().length(8),
    addressNumber: z.string().min(1),
  }).optional(),
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
  if (body.data.formaPagamento === "CARTAO" && !body.data.cartao) {
    return NextResponse.json({ error: "Preencha os dados do cartão." }, { status: 400 });
  }

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
    const descricao = `Créditos de IA — ${pack.tokens.toLocaleString("pt-BR")} tokens (FluxVenda)`;

    if (body.data.formaPagamento === "CARTAO") {
      const c = body.data.cartao!;
      const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const payment = await createAsaasCardCharge(
        apiKey, sandbox, asaasCustomerId, valor, descricao,
        { holderName: c.holderName, number: c.number, expiryMonth: c.expiryMonth, expiryYear: c.expiryYear, ccv: c.ccv },
        { name: c.holderName, email: team.manager.email, cpfCnpj, postalCode: c.postalCode, addressNumber: c.addressNumber, phone: team.manager.phone || "" },
        remoteIp
      );
      const pago = payment.status === "CONFIRMED" || payment.status === "RECEIVED";

      const compra = await prisma.creditoCompra.create({
        data: {
          teamId: team.id, packId: pack.id, tokens: pack.tokens, valorCentavos: pack.valorCentavos,
          formaPagamento: "CARTAO", cpfCnpj, asaasPaymentId: payment.id, status: pago ? "PAGO" : "PENDENTE",
        },
      });

      if (pago) {
        await prisma.team.update({ where: { id: team.id }, data: { aiCreditsBalance: { increment: pack.tokens } } });
      }

      return NextResponse.json({ compraId: compra.id, formaPagamento: "CARTAO", pago });
    }

    const payment = await createAsaasCharge(apiKey, sandbox, asaasCustomerId, valor, descricao, "PIX");
    const qr = await getAsaasPixQrCode(apiKey, sandbox, payment.id);

    const compra = await prisma.creditoCompra.create({
      data: {
        teamId: team.id, packId: pack.id, tokens: pack.tokens, valorCentavos: pack.valorCentavos,
        formaPagamento: "PIX", cpfCnpj, asaasPaymentId: payment.id, asaasPixPayload: qr.payload, status: "PENDENTE",
      },
    });

    return NextResponse.json({ compraId: compra.id, formaPagamento: "PIX", pixPayload: qr.payload });
  } catch (err: any) {
    console.error("[creditos-checkout]", err);
    return NextResponse.json({ error: err.message || "Não foi possível gerar a cobrança agora. Tente novamente." }, { status: 502 });
  }
}
