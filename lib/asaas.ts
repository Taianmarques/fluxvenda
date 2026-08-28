// Integração com a API do Asaas (gateway de pagamento) pra cobrança Pix dinâmica do
// agente de comércio. Sem SDK — a API é pequena e não tem lib oficial mantida.

function baseUrl(sandbox: boolean): string {
  return sandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}

async function asaasFetch(apiKey: string, sandbox: boolean, path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl(sandbox)}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", access_token: apiKey, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Asaas devolve { errors: [{ code, description }] } — description é a mensagem
    // em português que faz sentido mostrar pro usuário final (ex: "CVV inválido").
    let mensagem = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.errors?.[0]?.description) mensagem = parsed.errors[0].description;
    } catch {}
    throw new Error(mensagem || `Asaas ${path} falhou (${res.status})`);
  }
  return res.json();
}

export async function createAsaasCustomer(apiKey: string, sandbox: boolean, name: string, phone: string, cpfCnpj: string): Promise<{ id: string }> {
  return asaasFetch(apiKey, sandbox, "/customers", {
    method: "POST",
    body: JSON.stringify({ name, mobilePhone: phone, cpfCnpj }),
  });
}

// `value` já deve vir com o acréscimo de juros do parcelamento embutido (calculado por nós,
// não pelo Asaas) — installmentCount > 1 manda `totalValue` em vez de `value`, fazendo o
// Asaas dividir esse total em N parcelas iguais.
// `dueDate` é opcional — padrão amanhã (suficiente pra Pix/cartão) mas obrigatório pra boleto
// com vencimento específico.
export async function createAsaasCharge(
  apiKey: string, sandbox: boolean, customerId: string, value: number, description: string,
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO", installmentCount?: number, dueDate?: string
): Promise<{ id: string; invoiceUrl: string; bankSlipUrl?: string; installment?: string }> {
  const resolvedDueDate = dueDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const body: Record<string, unknown> = { customer: customerId, billingType, description, dueDate: resolvedDueDate };
  if (installmentCount && installmentCount > 1) {
    body.installmentCount = installmentCount;
    body.totalValue = value;
  } else {
    body.value = value;
  }
  return asaasFetch(apiKey, sandbox, "/payments", { method: "POST", body: JSON.stringify(body) });
}

export type CreditCardData = { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string };
export type CreditCardHolderInfo = { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; phone: string };

// Cobrança de cartão processada direto (sem redirecionar pra página hospedada do Asaas) —
// os dados do cartão passam pelo nosso backend só nesta chamada, nunca são gravados no
// banco. Diferente do Pix, o resultado é síncrono: `status` já vem CONFIRMED/RECEIVED (ou
// erro) na resposta, sem precisar de webhook pra saber se aprovou.
export async function createAsaasCardCharge(
  apiKey: string, sandbox: boolean, customerId: string, value: number, description: string,
  creditCard: CreditCardData, creditCardHolderInfo: CreditCardHolderInfo, remoteIp: string
): Promise<{ id: string; status: string }> {
  const dueDate = new Date().toISOString().slice(0, 10);
  return asaasFetch(apiKey, sandbox, "/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "CREDIT_CARD",
      value,
      dueDate,
      description,
      creditCard,
      creditCardHolderInfo,
      remoteIp,
    }),
  });
}

export async function getAsaasPixQrCode(apiKey: string, sandbox: boolean, paymentId: string): Promise<{ encodedImage: string; payload: string }> {
  return asaasFetch(apiKey, sandbox, `/payments/${paymentId}/pixQrCode`);
}

// Cancela uma cobrança no Asaas (necessário antes de reemitir boleto com nova data)
export async function cancelAsaasCharge(apiKey: string, sandbox: boolean, paymentId: string): Promise<void> {
  await asaasFetch(apiKey, sandbox, `/payments/${paymentId}`, { method: "DELETE" });
}
