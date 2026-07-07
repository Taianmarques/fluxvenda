// Pacotes de créditos extras de IA (top-up), vendidos via Stripe Checkout (pagamento único).
// Créditos não expiram e são consumidos automaticamente depois que o uso do mês estoura o
// monthlyTokenLimit da equipe (ver isOverQuota/logTokenUsage em lib/token-usage.ts).
export type CreditPack = {
  id: string;
  tokens: number;
  valorCentavos: number;
  label: string;
  destaque?: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", tokens: 300_000, valorCentavos: 2990, label: "Starter" },
  { id: "popular", tokens: 1_000_000, valorCentavos: 7990, label: "Popular", destaque: true },
  { id: "escala", tokens: 3_000_000, valorCentavos: 19990, label: "Escala" },
];

export function getCreditPack(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === packId);
}

// Estimativa grosseira de mensagens de atendimento por pacote (~700 tokens por troca
// com o agente, considerando histórico da conversa) — só para orientar a compra na UI.
export function estimateMessages(tokens: number): number {
  return Math.round(tokens / 700);
}
