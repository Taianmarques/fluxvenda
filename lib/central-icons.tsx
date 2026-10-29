import {
  Sparkles, Users, Gift, Megaphone, MessageCircle, Headset, Shield, Handshake, Repeat, BarChart3, CalendarDays,
  Folder, Target, Search, UserSearch, Brain, Lightbulb, Tag, BadgePercent, Crown, Rocket, Image as ImageIcon, Video, PenLine,
  Mail, Send, Phone, Filter, ListChecks, ClipboardList, MessageSquareQuote, ThumbsUp, Star, Heart, Gem, TrendingUp,
  LineChart, Goal, Map as MapIcon, Compass, FileText, Hash, Zap, Clock, HelpCircle, Award, Wallet, ShoppingCart, Store,
  type LucideIcon,
} from "lucide-react";

// Ícones disponíveis pra módulos e ferramentas da Central (o banco guarda o nome)
export const CENTRAL_ICONES: Record<string, LucideIcon> = {
  sparkles: Sparkles, users: Users, gift: Gift, megaphone: Megaphone, "message-circle": MessageCircle, headset: Headset,
  shield: Shield, handshake: Handshake, repeat: Repeat, "bar-chart": BarChart3, calendar: CalendarDays, folder: Folder,
  target: Target, search: Search, "user-search": UserSearch, brain: Brain, lightbulb: Lightbulb, tag: Tag,
  percent: BadgePercent, crown: Crown, rocket: Rocket, image: ImageIcon, video: Video, pen: PenLine, mail: Mail,
  send: Send, phone: Phone, filter: Filter, checklist: ListChecks, clipboard: ClipboardList, quote: MessageSquareQuote,
  "thumbs-up": ThumbsUp, star: Star, heart: Heart, gem: Gem, "trending-up": TrendingUp, "line-chart": LineChart,
  goal: Goal, map: MapIcon, compass: Compass, "file-text": FileText, hash: Hash, zap: Zap, clock: Clock,
  help: HelpCircle, award: Award, wallet: Wallet, cart: ShoppingCart, store: Store,
};

// Cor de cada módulo (ícones, etiquetas e blocos de "Escolha seu desafio") — classes literais pro Tailwind
export type CorModulo = { icone: string; fundo: string; etiqueta: string };
const CORES: Record<string, CorModulo> = {
  "conheca-seu-cliente": { icone: "text-rose-600", fundo: "bg-rose-50", etiqueta: "bg-rose-50 text-rose-700" },
  "criacao-de-ofertas": { icone: "text-amber-600", fundo: "bg-amber-50", etiqueta: "bg-amber-50 text-amber-700" },
  "anuncios-e-aquisicao": { icone: "text-indigo-600", fundo: "bg-indigo-50", etiqueta: "bg-indigo-50 text-indigo-700" },
  "conteudo-e-whatsapp": { icone: "text-emerald-600", fundo: "bg-emerald-50", etiqueta: "bg-emerald-50 text-emerald-700" },
  "atendimento-e-qualificacao": { icone: "text-violet-600", fundo: "bg-violet-50", etiqueta: "bg-violet-50 text-violet-700" },
  "negociacao-e-objecoes": { icone: "text-orange-600", fundo: "bg-orange-50", etiqueta: "bg-orange-50 text-orange-700" },
  "follow-up-e-fechamento": { icone: "text-sky-600", fundo: "bg-sky-50", etiqueta: "bg-sky-50 text-sky-700" },
  "pos-venda-e-recompra": { icone: "text-pink-600", fundo: "bg-pink-50", etiqueta: "bg-pink-50 text-pink-700" },
  "gestao-comercial": { icone: "text-blue-600", fundo: "bg-blue-50", etiqueta: "bg-blue-50 text-blue-700" },
  "planejamento-comercial": { icone: "text-teal-600", fundo: "bg-teal-50", etiqueta: "bg-teal-50 text-teal-700" },
};
const COR_PADRAO: CorModulo = { icone: "text-slate-600", fundo: "bg-slate-100", etiqueta: "bg-slate-100 text-slate-700" };

export function corDoModulo(moduloId: string): CorModulo {
  return CORES[moduloId] ?? COR_PADRAO;
}

export function CentralIcone({ nome, size = 18, className }: { nome: string; size?: number; className?: string }) {
  const Icon = CENTRAL_ICONES[nome] ?? Sparkles;
  return <Icon size={size} className={className} aria-hidden />;
}
