import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAsaasCustomer, createAsaasCharge, createAsaasCardCharge, getAsaasPixQrCode, getAsaasPayment } from "@/lib/asaas";
import { checkoutTotal } from "@/lib/lead-form-shared";
import { resolvePaymentAccount, findCheckoutStep, markLeadFormPaid } from "@/lib/lead-form-checkout";

// Checkout dentro do quiz em telas (pública). O valor sai SEMPRE da etapa salva no formulário —
// o navegador só manda a escolha (Pix/cartão, parcelas) e os dados do comprador. Dados do cartão
// passam direto pro Asaas e não são gravados. Exige uma resposta do formulário com WhatsApp (o
// lead já passou pelo quiz) e limita as tentativas por resposta.

const MAX_TENTATIVAS = 6;

const schema = z.object({
  submissionId: z.string().min(1),
  stepId: z.string().min(1),
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  cpf: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length === 11 || v.length === 14, "CPF/CNPJ inválido"),
  telefone: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length >= 10 && v.length <= 13, "Telefone inválido"),
  metodo: z.enum(["PIX", "CARTAO"]),
  parcelas: z.number().int().min(1).max(12).default(1),
  cartao: z.object({
    holderName: z.string().trim().min(3).max(120),
    number: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length >= 13 && v.length <= 19, "Número do cartão inválido"),
    expiryMonth: z.string().regex(/^\d{2}$/, "Validade inválida"),
    expiryYear: z.string().regex(/^\d{2,4}$/, "Validade inválida"),
    ccv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
    postalCode: z.string().transform(v => v.replace(/\D/g, "")).refine(v => v.length === 8, "CEP inválido"),
    addressNumber: z.string().trim().min(1, "Informe o número do endereço").max(10),
  }).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const b = parsed.data;

  const form = await prisma.leadForm.findUnique({ where: { slug }, select: { id: true, active: true, agentConfigId: true, agentOwned: true, checkoutSandbox: true, steps: true, title: true } });
  if (!form?.active) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  const step = findCheckoutStep(form.steps, b.stepId);
  if (!step) return NextResponse.json({ error: "Checkout não encontrado" }, { status: 404 });
  if ((b.metodo === "PIX" && !step.pix) || (b.metodo === "CARTAO" && !step.cartao)) {
    return NextResponse.json({ error: "Forma de pagamento indisponível" }, { status: 400 });
  }
  if (b.metodo === "CARTAO" && !b.cartao) return NextResponse.json({ error: "Preencha os dados do cartão" }, { status: 400 });

  const sub = await prisma.leadFormSubmission.findUnique({ where: { id: b.submissionId } });
  if (!sub || sub.formId !== form.id || !sub.whatsapp) return NextResponse.json({ error: "Responda o quiz antes de pagar" }, { status: 400 });
  if (sub.payStatus === "PAGO") return NextResponse.json({ status: "PAGO" });
  if (sub.payAttempts >= MAX_TENTATIVAS) {
    return NextResponse.json({ error: "Muitas tentativas de pagamento. Fale com a gente pelo WhatsApp." }, { status: 429 });
  }

  const conta = await resolvePaymentAccount(form);
  if (!conta) return NextResponse.json({ error: "Pagamento indisponível no momento. Fale com a gente pelo WhatsApp." }, { status: 503 });

  const parcelas = b.metodo === "CARTAO" ? Math.min(b.parcelas, step.parcelasMax) : 1;
  const valor = b.metodo === "CARTAO" ? checkoutTotal(step, parcelas) : step.precoPor;
  const descricao = `${step.produtoNome} (${form.title})`.slice(0, 200);

  await prisma.leadFormSubmission.update({
    where: { id: sub.id },
    data: {
      payAttempts: { increment: 1 }, payMethod: b.metodo, payValueCents: Math.round(valor * 100), payInstallments: parcelas,
      payCpf: b.cpf, payEmail: b.email, payStatus: "PENDENTE", payAsaasId: null, payInstallmentId: null, payPixPayload: null,
    },
  });

  try {
    const customer = await createAsaasCustomer(conta.apiKey, conta.sandbox, b.nome, b.telefone, b.cpf);

    if (b.metodo === "CARTAO") {
      const c = b.cartao!;
      const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const payment = await createAsaasCardCharge(
        conta.apiKey, conta.sandbox, customer.id, valor, descricao,
        { holderName: c.holderName, number: c.number, expiryMonth: c.expiryMonth, expiryYear: c.expiryYear.slice(-2).padStart(4, "20"), ccv: c.ccv },
        { name: b.nome, email: b.email, cpfCnpj: b.cpf, postalCode: c.postalCode, addressNumber: c.addressNumber, phone: b.telefone },
        remoteIp, parcelas,
      );
      const pago = payment.status === "CONFIRMED" || payment.status === "RECEIVED";
      await prisma.leadFormSubmission.update({
        where: { id: sub.id },
        data: { payAsaasId: payment.id, payInstallmentId: payment.installment ?? null, payStatus: pago ? "PENDENTE" : "RECUSADO" },
      });
      if (!pago) return NextResponse.json({ error: "Pagamento não aprovado. Confira os dados do cartão ou tente o Pix." }, { status: 402 });
      await markLeadFormPaid(sub.id);
      return NextResponse.json({ status: "PAGO" });
    }

    const payment = await createAsaasCharge(conta.apiKey, conta.sandbox, customer.id, valor, descricao, "PIX");
    const qr = await getAsaasPixQrCode(conta.apiKey, conta.sandbox, payment.id);
    await prisma.leadFormSubmission.update({ where: { id: sub.id }, data: { payAsaasId: payment.id, payPixPayload: qr.payload } });
    return NextResponse.json({ status: "PENDENTE", pixPayload: qr.payload, pixQrBase64: qr.encodedImage });
  } catch (err) {
    console.error("[formularios/checkout]", err);
    await prisma.leadFormSubmission.update({ where: { id: sub.id }, data: { payStatus: "RECUSADO" } }).catch(() => {});
    const msg = err instanceof Error && err.message.length < 200 ? err.message : "Não foi possível gerar o pagamento. Tente novamente.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// Consulta do Pix — a tela do quiz pergunta de tempos em tempos. Além do webhook, confere o status
// direto no Asaas (Pix de teste no sandbox e webhook atrasado/mal configurado confirmam igual).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const submissionId = req.nextUrl.searchParams.get("submissionId") ?? "";
  const sub = await prisma.leadFormSubmission.findFirst({
    where: { id: submissionId, form: { slug } },
    select: {
      id: true, payStatus: true, payAsaasId: true,
      form: { select: { agentOwned: true, agentConfigId: true, checkoutSandbox: true } },
    },
  });
  if (!sub) return NextResponse.json({ status: null });

  if (sub.payStatus === "PENDENTE" && sub.payAsaasId) {
    const conta = await resolvePaymentAccount(sub.form);
    if (conta) {
      const payment = await getAsaasPayment(conta.apiKey, conta.sandbox, sub.payAsaasId).catch(() => null);
      if (payment && (payment.status === "RECEIVED" || payment.status === "CONFIRMED")) {
        await markLeadFormPaid(sub.id);
        return NextResponse.json({ status: "PAGO" });
      }
    }
  }
  return NextResponse.json({ status: sub.payStatus });
}