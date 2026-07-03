// Integração com a API Open Banking do Banco BV para simulação de financiamento veicular.
// Documentação: https://developers-sandbox.bvopen.com.br/api/70
// Autenticação: OAuth 2.0 Client Credentials

const BV_SANDBOX_URL = "https://developers-sandbox.bvopen.com.br";
const BV_PROD_URL = "https://api.bvopen.com.br";

export type BvSimulationParams = {
  cpf: string;
  dataNascimento: string; // "DD/MM/AAAA"
  possuiHabilitacao: boolean;
  valorVeiculo: number;
  valorEntrada: number;
  prazoMeses: number; // 24, 36, 48 ou 60
};

export type BvSimulationResult = {
  valorParcela: number;
  taxaMensal: number; // % ao mês
  cet: number; // Custo Efetivo Total % ao ano
  valorTotal: number;
  raw: unknown; // resposta JSON completa da API BV para auditoria
};

async function getBvToken(
  clientId: string,
  clientSecret: string,
  sandbox: boolean
): Promise<string> {
  const baseUrl = sandbox ? BV_SANDBOX_URL : BV_PROD_URL;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BV OAuth falhou (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("BV OAuth: access_token ausente na resposta");
  }

  return data.access_token as string;
}

export async function simularFinanciamentoBV(
  clientId: string,
  clientSecret: string,
  sandbox: boolean,
  params: BvSimulationParams
): Promise<BvSimulationResult> {
  const baseUrl = sandbox ? BV_SANDBOX_URL : BV_PROD_URL;
  const token = await getBvToken(clientId, clientSecret, sandbox);

  // Payload conforme documentação da API BV (https://developers-sandbox.bvopen.com.br/api/70)
  const payload = {
    cpf: params.cpf.replace(/\D/g, ""),
    dataNascimento: params.dataNascimento, // "DD/MM/AAAA"
    possuiHabilitacao: params.possuiHabilitacao,
    valorBem: params.valorVeiculo,
    valorEntrada: params.valorEntrada,
    quantidadeParcelas: params.prazoMeses,
  };

  const res = await fetch(`${baseUrl}/v1/financiamento/simulacao`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BV simulação falhou (${res.status}): ${err}`);
  }

  const data = await res.json();

  // Normaliza a resposta — ajuste os campos conforme a resposta real da API BV
  const valorParcela: number =
    data.valorParcela ?? data.parcela?.valor ?? data.installmentValue ?? 0;
  const taxaMensal: number =
    data.taxaMensal ?? data.taxa?.mensal ?? data.monthlyRate ?? 0;
  const cet: number =
    data.cet ?? data.custoEfetivoTotal ?? data.effectiveCost ?? 0;
  const valorTotal: number =
    data.valorTotal ?? data.totalFinanciado ?? data.totalAmount ?? 0;

  return { valorParcela, taxaMensal, cet, valorTotal, raw: data };
}
