import {
  Scissors, MonitorSmartphone, Factory, Briefcase, ShoppingBag, HeartPulse, GraduationCap,
  Landmark, Car, Receipt, Wrench, PaintBucket, Cog, Droplets, KeyRound, Bike, type LucideIcon,
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

export function getServiceIcon(segmento?: string | null, subsegmento?: string | null): LucideIcon {
  if (subsegmento && SUBSEGMENTO_ICON[subsegmento]) return SUBSEGMENTO_ICON[subsegmento]!;
  if (segmento && segmento in SEGMENTO_ICON) return SEGMENTO_ICON[segmento as Segmento];
  return Scissors; // fallback — comportamento de sempre pra agentes sem segmento definido
}
