import {
  MessageCircle, KanbanSquare, Calendar, Wallet, ShoppingCart, Landmark, Target,
  Wifi, GitBranch, Briefcase, Zap, Filter, UserPlus, ClipboardCheck, Radio,
  Megaphone, Phone, Coins, type LucideIcon,
} from "lucide-react";

// Fonte única das páginas do CRM — usada pelo CrmSidebar (menu), CrmPageGate (bloqueio
// por página) e pela UI de perfis de acesso em EquipeClient (checklist), pra nunca ficar
// dessincronizada entre essas três coisas.
export type CrmPageKey =
  | "mensagens" | "aovivo"
  | "pipeline" | "agenda" | "vendas" | "comercio"
  | "campanhas" | "ligacoes" | "prospeccao"
  | "cobranca" | "funil" | "carteira"
  | "automacao" | "condicoes"
  | "canais" | "equipe" | "auditoria" | "creditos";

export type CrmPageDef = {
  key: CrmPageKey;
  label: string;
  suffix: string; // appended to /crm/${agentId}
  icon: LucideIcon;
  // Já restrita ao gestor por checagem própria da página (aovivo/campanhas/auditoria) —
  // fica fora do checklist de perfis, sem sentido liberar via perfil pra quem não é gestor
  managerOnly?: true;
};

export type CrmCategoryDef = {
  key: string;
  label: string;
  variant: "accordion" | "flyout";
  pages: CrmPageDef[];
};

export const CRM_CATEGORIES: CrmCategoryDef[] = [
  { key: "atendimento", label: "Atendimento", variant: "accordion", pages: [
    { key: "mensagens", label: "Mensagens", suffix: "", icon: MessageCircle },
    { key: "aovivo", label: "Ao vivo", suffix: "/aovivo", icon: Radio, managerOnly: true },
    { key: "agenda", label: "Agenda", suffix: "/agenda", icon: Calendar },
    { key: "auditoria", label: "Auditoria", suffix: "/auditoria", icon: ClipboardCheck, managerOnly: true },
  ] },
  { key: "vendas", label: "Vendas", variant: "accordion", pages: [
    { key: "pipeline", label: "Pipeline", suffix: "/pipeline", icon: KanbanSquare },
    { key: "vendas", label: "Vendas", suffix: "/vendas", icon: Wallet },
    { key: "comercio", label: "Produtos", suffix: "/comercio", icon: ShoppingCart },
  ] },
  { key: "marketing", label: "Marketing", variant: "flyout", pages: [
    { key: "campanhas", label: "Campanhas", suffix: "/campanhas", icon: Megaphone, managerOnly: true },
    { key: "ligacoes", label: "Ligações", suffix: "/ligacoes", icon: Phone },
    { key: "prospeccao", label: "Prospecção", suffix: "/prospeccao", icon: Target },
  ] },
  { key: "gestao", label: "Gestão", variant: "flyout", pages: [
    { key: "cobranca", label: "Cobranças", suffix: "/cobranca", icon: Landmark },
    { key: "funil", label: "Funil", suffix: "/funil", icon: Filter },
    { key: "carteira", label: "Carteira", suffix: "/carteira", icon: Briefcase },
  ] },
  { key: "automacao", label: "Automação", variant: "flyout", pages: [
    { key: "automacao", label: "Automação", suffix: "/automacao", icon: Zap },
    { key: "condicoes", label: "Condições", suffix: "/condicoes", icon: GitBranch },
  ] },
  { key: "configuracoes", label: "Configurações", variant: "flyout", pages: [
    { key: "canais", label: "Canais", suffix: "/canais", icon: Wifi },
    { key: "equipe", label: "Equipe", suffix: "/equipe", icon: UserPlus },
    { key: "creditos", label: "Créditos de IA", suffix: "/creditos", icon: Coins },
  ] },
];

export const CRM_PAGES: Record<CrmPageKey, CrmPageDef> = Object.fromEntries(
  CRM_CATEGORIES.flatMap(c => c.pages).map(p => [p.key, p]),
) as Record<CrmPageKey, CrmPageDef>;

export const CRM_PAGE_KEYS = Object.keys(CRM_PAGES) as CrmPageKey[];

// Chaves configuráveis num perfil de acesso — exclui as managerOnly, que já são
// bloqueadas via isManager independente de perfil atribuído
export const CONFIGURABLE_PAGE_KEYS = CRM_PAGE_KEYS.filter(k => !CRM_PAGES[k].managerOnly);
