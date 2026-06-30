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
    throw new Error(`Asaas ${path} falhou (${res.status}): ${body}`);
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
export async function createAsaasCharge(
  apiKey: string, sandbox: boolean, customerId: string, value: number, description: string,
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO", installmentCount?: number
): Promise<{ id: string; invoiceUrl: string; bankSlipUrl?: string; installment?: string }> {
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const body: Record<string, unknown> = { customer: customerId, billingType, description, dueDate };
  if (installmentCount && installmentCount > 1) {
    body.installmentCount = installmentCount;
    body.totalValue = value;
  } else {
    body.value = value;
  }
  return asaasFetch(apiKey, sandbox, "/payments", { method: "POST", body: JSON.stringify(body) });
}

export async function getAsaasPixQrCode(apiKey: string, sandbox: boolean, paymentId: string): Promise<{ encodedImage: string; payload: string }> {
  return asaasFetch(apiKey, sandbox, `/payments/${paymentId}/pixQrCode`);
}
