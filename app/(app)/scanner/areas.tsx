import {
  BarChart3, Filter, Gem, Handshake, Repeat, Shield, Target, TrendingUp, Users, Wallet, Workflow, Wrench, type LucideIcon,
} from "lucide-react";

// Ícone e cor de cada área do Diagnóstico Comercial (as mesmas chaves servem pros dois tipos,
// mas no auto-diagnóstico do vendedor algumas áreas significam outra coisa)
type Visual = { icone: LucideIcon; cor: string };

const EMPRESA: Record<string, Visual> = {
  leads: { icone: Target, cor: "bg-blue-50 text-blue-600" },
  process: { icone: Workflow, cor: "bg-violet-50 text-violet-600" },
  team: { icone: Users, cor: "bg-sky-50 text-sky-600" },
  kpis: { icone: BarChart3, cor: "bg-indigo-50 text-indigo-600" },
  tools: { icone: Wrench, cor: "bg-slate-100 text-slate-600" },
  value: { icone: Gem, cor: "bg-amber-50 text-amber-600" },
  retention: { icone: Repeat, cor: "bg-pink-50 text-pink-600" },
  money: { icone: Wallet, cor: "bg-emerald-50 text-emerald-600" },
};

const VENDEDOR: Record<string, Visual> = {
  ...EMPRESA,
  process: { icone: Filter, cor: "bg-violet-50 text-violet-600" },
  team: { icone: Shield, cor: "bg-orange-50 text-orange-600" },
  kpis: { icone: Handshake, cor: "bg-sky-50 text-sky-600" },
  retention: { icone: TrendingUp, cor: "bg-pink-50 text-pink-600" },
};

export function visualDaArea(chave: string, vendedor: boolean): Visual {
  return (vendedor ? VENDEDOR : EMPRESA)[chave] ?? { icone: Target, cor: "bg-slate-100 text-slate-600" };
}

export function IconeArea({ chave, vendedor, tamanho = "md" }: { chave: string; vendedor: boolean; tamanho?: "sm" | "md" | "lg" }) {
  const { icone: Icone, cor } = visualDaArea(chave, vendedor);
  const dim = tamanho === "lg" ? "w-12 h-12 rounded-2xl" : tamanho === "sm" ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl";
  return (
    <span className={`${dim} ${cor} flex items-center justify-center flex-shrink-0`}>
      <Icone size={tamanho === "lg" ? 22 : tamanho === "sm" ? 15 : 19} />
    </span>
  );
}
