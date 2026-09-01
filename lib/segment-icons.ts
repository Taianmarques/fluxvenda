import {
  Scissors, MonitorSmartphone, Factory, Briefcase, ShoppingBag, HeartPulse, GraduationCap,
  Landmark, Car, Receipt, Wrench, PaintBucket, Cog, Droplets, KeyRound, Bike, Stethoscope,
  Coffee, Utensils, Dumbbell, Sparkles, Home, Camera, PawPrint, type LucideIcon,
} from "lucide-react";
import { SEGMENTS } from "@/lib/segments";

type Segmento = (typeof SEGMENTS)[number];

// Ícone exibido ao lado de cada serviço na página pública de agendamento
// (app/agendar/[agentId]/AgendarClient.tsx) — antes era sempre Scissors (tesoura), que só
// fazia sentido pra salão/barbearia. Escolhido pelo segmento/subsegmento do agente (mesma
// taxonomia de lib/segments.ts, já usada pra personalizar o system prompt).
const SEGMENTO_ICON: Record<Segmento, LucideIcon> = {
  "SaaS": MonitorSmartphone,
  "Indústria": Factory,
  "Serviços": Briefcase,
  "Varejo": ShoppingBag,
  "Saúde": HeartPulse,
  "Educação": GraduationCap,
  "Financeiro": Landmark,
  "Automotivo e Veículos": Car,
  "Cobrança": Receipt,
};

// Subsegmentos onde o ícone do segmento inteiro (ex: Car pra "Automotivo e Veículos") ficaria
// genérico demais — o segmento automotivo é o caso mais heterogêneo (lavagem, oficina, funilaria,
// moto... cada um com uma cara bem diferente), por isso é o único com esse nível de refinamento.
const SUBSEGMENTO_ICON: Partial<Record<string, LucideIcon>> = {
  "Oficina Mecânica": Wrench,
  "Funilaria e Pintura": PaintBucket,
  "Autopeças e Acessórios": Cog,
  "Estética Automotiva": Droplets,
  "Locação de Veículos": KeyRound,
  "Motos": Bike,
};

// Opções que o gestor pode escolher manualmente (AgentConfig.agendamentoIcone) na tela de
// Agenda > Serviços, pra quando o automático não bater com o negócio dele — a chave é o
// valor salvo no banco, o label é o que aparece no seletor.
export const ICON_OPTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "scissors", label: "Salão / Barbearia", icon: Scissors },
  { key: "car", label: "Automotivo (geral)", icon: Car },
  { key: "wrench", label: "Oficina / Manutenção", icon: Wrench },
  { key: "droplets", label: "Lavagem / Estética automotiva", icon: Droplets },
  { key: "paint-bucket", label: "Funilaria / Pintura", icon: PaintBucket },
  { key: "cog", label: "Peças / Acessórios", icon: Cog },
  { key: "key-round", label: "Locação", icon: KeyRound },
  { key: "bike", label: "Motos", icon: Bike },
  { key: "heart-pulse", label: "Saúde (geral)", icon: HeartPulse },
  { key: "stethoscope", label: "Clínica / Consultório", icon: Stethoscope },
  { key: "graduation-cap", label: "Educação", icon: GraduationCap },
  { key: "briefcase", label: "Serviços / Consultoria", icon: Briefcase },
  { key: "shopping-bag", label: "Varejo", icon: ShoppingBag },
  { key: "factory", label: "Indústria", icon: Factory },
  { key: "landmark", label: "Financeiro", icon: Landmark },
  { key: "receipt", label: "Cobrança", icon: Receipt },
  { key: "monitor-smartphone", label: "Tecnologia", icon: MonitorSmartphone },
  { key: "coffee", label: "Cafeteria", icon: Coffee },
  { key: "utensils", label: "Alimentação", icon: Utensils },
  { key: "dumbbell", label: "Academia / Fitness", icon: Dumbbell },
  { key: "sparkles", label: "Estética / Beleza", icon: Sparkles },
  { key: "home", label: "Casa / Imóveis", icon: Home },
  { key: "camera", label: "Fotografia", icon: Camera },
  { key: "paw-print", label: "Pet", icon: PawPrint },
];

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(ICON_OPTIONS.map(o => [o.key, o.icon]));

export function getServiceIcon(segmento?: string | null, subsegmento?: string | null, override?: string | null): LucideIcon {
  if (override && ICON_BY_KEY[override]) return ICON_BY_KEY[override];
  if (subsegmento && SUBSEGMENTO_ICON[subsegmento]) return SUBSEGMENTO_ICON[subsegmento]!;
  if (segmento && segmento in SEGMENTO_ICON) return SEGMENTO_ICON[segmento as Segmento];
  return Scissors; // fallback — comportamento de sempre pra agentes sem segmento definido
}
