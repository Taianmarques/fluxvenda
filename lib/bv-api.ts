// Integração com a API Open Banking do Banco BV — Condições de Financiamento Veicular.
// Spec: POST /partner-funding/v1/financing-conditions
// Sandbox: https://apige-uat-sbx.bancobv.com.br
// Auth: OAuth 2.0 Client Credentials (Bearer JWT)

const BV_SANDBOX_BASE = "https://apige-uat-sbx.bancobv.com.br";
const BV_PROD_BASE = "https://apige.bancobv.com.br"; // confirmar URL de produção no portal BV

// O endpoint OAuth do BV pode estar num host diferente — ajustar se necessário.
// Padrão observado na sandbox: mesmo host do gateway.
const bvOAuthUrl = (sandbox: boolean) =>
  `${sandbox ? BV_SANDBOX_BASE : BV_PROD_BASE}/oauth/token`;

const bvApiUrl = (sandbox: boolean) =>
  `${sandbox ? BV_SANDBOX_BASE : BV_PROD_BASE}/partner-funding/v1`;

// ─── Tipos do contrato BV ────────────────────────────────────────────────────

export type BvFinancingRequest = {
  // Obrigatórios (conforme spec BV)
  zeroVehicle: boolean;                    // true = 0km, false = usado
  personType: "F" | "J";                  // F = Física, J = Jurídica
  vehicleCategoryDescription: string;     // "AUTOMOVEL", "MOTO", etc.
  commercialPartnerCode: string;          // código do parceiro/loja no BV
  cylinderQuantity: number;               // cilindradas do motor (inteiro)
  financingEntryDate: string;             // "YYYY-MM-DD" — data de entrada do financiamento
  vehicleModelYear: string;               // "2023" — 4 dígitos
  // Opcionais
  financingTableCode?: string;
  vehicleBrandDescription?: string;       // "HONDA", "TOYOTA", etc.
  fullVehicleModelVersionDescription?: string; // "KA SEDAN SE PLUS 1.0 12V 4P"
  vehicleSubCategoryDescription?: string;
};

type BvReturnRate = {
  code: number;
  description: string;
  value: number;   // taxa (% — verificar se mensal ou anual com BV)
  default: boolean;
};

type BvFinancingTerm = {
  financingTerm: number; // prazo em meses
  default: boolean;
};

type BvFinancingTable = {
  code: string;
  commercialDescription: string;
  minimumEntryValuePercentage: number;
  minimumFinancingGraceDate: string;
  maximumFinancingGraceDate: string;
  plusPercentage: string;
  financingReturnRateDataList: BvReturnRate[];
  financingTermDataList: BvFinancingTerm[];
  default: boolean;
};

export type BvFinancingConditionsResult = {
  tables: BvFinancingTable[];
  defaultTable: BvFinancingTable | null;
  defaultRate: number | null;    // taxa da tabela padrão com default: true
  availableTerms: number[];      // prazos disponíveis em meses (ordenados)
  defaultTerm: number | null;
  raw: unknown;                  // resposta JSON completa para auditoria
};

// ─── PMT — cálculo local de parcela estimada ─────────────────────────────────
// Usa a taxa retornada pelo BV como proxy para estimar a parcela.
// Nota: as taxas da BV são "taxas de retorno" — confirmar com BV se são mensais ou anuais.
export function calcularPMT(
  valorFinanciado: number,
  taxaMensalPct: number,
  prazoMeses: number
): number {
  if (taxaMensalPct === 0 || prazoMeses === 0) return valorFinanciado / Math.max(prazoMeses, 1);
  const i = taxaMensalPct / 100;
  return (valorFinanciado * i * Math.pow(1 + i, prazoMeses)) / (Math.pow(1 + i, prazoMeses) - 1);
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

async function getBvToken(
  clientId: string,
  clientSecret: string,
  sandbox: boolean
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(bvOAuthUrl(sandbox), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`BV OAuth falhou (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("BV OAuth: access_token ausente na resposta");
  return data.access_token as string;
}

// ─── Chamada principal ────────────────────────────────────────────────────────

export async function buscarCondicoesFinanciamentoBV(
  clientId: string,
  clientSecret: string,
  sandbox: boolean,
  params: BvFinancingRequest
): Promise<BvFinancingConditionsResult> {
  const token = await getBvToken(clientId, clientSecret, sandbox);

  const res = await fetch(`${bvApiUrl(sandbox)}/financing-conditions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`BV financing-conditions falhou (${res.status}): ${err}`);
  }

  const data = await res.json();
  const tables: BvFinancingTable[] = data.financingTableParameterList ?? [];

  const defaultTable = tables.find(t => t.default) ?? tables[0] ?? null;

  const defaultRate =
    defaultTable?.financingReturnRateDataList?.find(r => r.default)?.value
    ?? defaultTable?.financingReturnRateDataList?.[0]?.value
    ?? null;

  const availableTerms = (defaultTable?.financingTermDataList ?? [])
    .map(t => t.financingTerm)
    .sort((a, b) => a - b);

  const defaultTerm =
    defaultTable?.financingTermDataList?.find(t => t.default)?.financingTerm
    ?? availableTerms[Math.floor(availableTerms.length / 2)]
    ?? null;

  return { tables, defaultTable, defaultRate, availableTerms, defaultTerm, raw: data };
}
