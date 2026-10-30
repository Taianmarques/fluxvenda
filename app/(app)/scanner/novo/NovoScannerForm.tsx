"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";
import { IconeArea } from "../areas";

const TEAM_SIZES = ["1-5", "6-15", "16-50", "51-200", "200+"];

type Question = { id: string; catKey: string; text: string };

// ─── Perguntas para GESTOR (avaliação da empresa) ────────────────────────────
const QUESTIONS_EMPRESA: { category: string; catKey: string; icon: string; questions: Question[] }[] = [
  {
    category: "Geração de Leads", catKey: "leads", icon: "🎯",
    questions: [
      { id: "leads_1", catKey: "leads", text: "Sua empresa tem fontes de geração de leads bem definidas e ativas?" },
      { id: "leads_2", catKey: "leads", text: "O volume de leads gerados mensalmente é suficiente para bater as metas?" },
      { id: "leads_3", catKey: "leads", text: "Os leads chegam com algum nível de qualificação (ICP definido)?" },
      { id: "leads_4", catKey: "leads", text: "Há ferramentas ou processos automatizados de prospecção ativa?" },
      { id: "leads_5", catKey: "leads", text: "Você sabe o custo por lead e acompanha essa métrica regularmente?" },
    ],
  },
  {
    category: "Processo de Vendas", catKey: "process", icon: "⚙️",
    questions: [
      { id: "process_1", catKey: "process", text: "Existe um funil de vendas formal com etapas claras e critérios de avanço?" },
      { id: "process_2", catKey: "process", text: "Há um playbook de vendas documentado e seguido pela equipe?" },
      { id: "process_3", catKey: "process", text: "O ciclo médio de vendas é conhecido e está dentro do esperado?" },
      { id: "process_4", catKey: "process", text: "A taxa de conversão entre etapas do funil é monitorada regularmente?" },
      { id: "process_5", catKey: "process", text: "Existe um processo estruturado de follow-up com leads e oportunidades?" },
    ],
  },
  {
    category: "Equipe", catKey: "team", icon: "👥",
    questions: [
      { id: "team_1", catKey: "team", text: "A equipe recebe treinamentos de vendas de forma contínua?" },
      { id: "team_2", catKey: "team", text: "Cada vendedor tem metas individuais claras e acompanhadas?" },
      { id: "team_3", catKey: "team", text: "Existe um processo de onboarding para novos vendedores?" },
      { id: "team_4", catKey: "team", text: "O time está engajado e motivado com o plano de remuneração?" },
      { id: "team_5", catKey: "team", text: "O tamanho da equipe de vendas é adequado para as metas da empresa?" },
    ],
  },
  {
    category: "KPIs & Dados", catKey: "kpis", icon: "📊",
    questions: [
      { id: "kpis_1", catKey: "kpis", text: "A empresa possui dashboards de vendas atualizados e acessíveis?" },
      { id: "kpis_2", catKey: "kpis", text: "Existe um processo de forecast de vendas mensal ou trimestral?" },
      { id: "kpis_3", catKey: "kpis", text: "O pipeline de vendas é revisado em reuniões regulares?" },
      { id: "kpis_4", catKey: "kpis", text: "A taxa de churn de clientes é monitorada e há ações para reduzi-la?" },
      { id: "kpis_5", catKey: "kpis", text: "LTV e CAC são calculados e acompanhados regularmente?" },
    ],
  },
  {
    category: "Ferramentas", catKey: "tools", icon: "🔧",
    questions: [
      { id: "tools_1", catKey: "tools", text: "A equipe usa um CRM de forma consistente para registrar todas as interações?" },
      { id: "tools_2", catKey: "tools", text: "Há ferramentas de automação de marketing ou vendas integradas ao processo?" },
      { id: "tools_3", catKey: "tools", text: "A equipe usa ferramentas de prospecção digital (LinkedIn Sales Navigator, etc.)?" },
      { id: "tools_4", catKey: "tools", text: "As ferramentas de comunicação com clientes estão bem integradas?" },
      { id: "tools_5", catKey: "tools", text: "A equipe adota bem as ferramentas disponíveis sem resistência?" },
    ],
  },
  {
    category: "Proposta de Valor", catKey: "value", icon: "💎",
    questions: [
      { id: "value_1", catKey: "value", text: "Sua proposta de valor é claramente diferente da concorrência?" },
      { id: "value_2", catKey: "value", text: "Os vendedores comunicam a proposta de valor de forma consistente?" },
      { id: "value_3", catKey: "value", text: "A empresa tem cases de sucesso usados no processo comercial?" },
      { id: "value_4", catKey: "value", text: "A estratégia de precificação é clara e defensável perante concorrentes?" },
      { id: "value_5", catKey: "value", text: "O posicionamento da empresa no mercado está bem definido?" },
    ],
  },
  {
    category: "Retenção", catKey: "retention", icon: "🔄",
    questions: [
      { id: "retention_1", catKey: "retention", text: "Existe um processo de onboarding de clientes bem estruturado?" },
      { id: "retention_2", catKey: "retention", text: "Há uma área ou responsável por Customer Success?" },
      { id: "retention_3", catKey: "retention", text: "A satisfação dos clientes é medida regularmente (NPS, CSAT ou similar)?" },
      { id: "retention_4", catKey: "retention", text: "Existe uma estratégia ativa de upsell e cross-sell para a base atual?" },
      { id: "retention_5", catKey: "retention", text: "O processo de renovação de contratos é proativo e tem boa taxa de sucesso?" },
    ],
  },
  {
    category: "Dinheiro na Mesa", catKey: "money", icon: "💰",
    questions: [
      { id: "money_1", catKey: "money", text: "Você realiza upsell ou cross-sell de forma ativa para clientes que já compraram?" },
      { id: "money_2", catKey: "money", text: "Existe um processo para reativar clientes inativos ou que não compram há mais de 90 dias?" },
      { id: "money_3", catKey: "money", text: "Sua política de descontos é controlada — você evita dar desconto sem contrapartida?" },
      { id: "money_4", catKey: "money", text: "Você tem um programa estruturado de indicações (referral) com incentivo para clientes satisfeitos?" },
      { id: "money_5", catKey: "money", text: "Você monitora o ticket médio por cliente e tem iniciativas ativas para aumentá-lo?" },
    ],
  },
];

// ─── Perguntas para VENDEDOR (autoavaliação individual) ──────────────────────
const QUESTIONS_VENDEDOR: { category: string; catKey: string; icon: string; questions: Question[] }[] = [
  {
    category: "Prospecção Ativa", catKey: "leads", icon: "🎯",
    questions: [
      { id: "leads_1", catKey: "leads", text: "Você prospecta ativamente novos clientes de forma consistente (diária ou semanal)?" },
      { id: "leads_2", catKey: "leads", text: "Você tem um perfil claro de cliente ideal (ICP) e foca seus esforços nele?" },
      { id: "leads_3", catKey: "leads", text: "Você usa múltiplos canais para prospectar (LinkedIn, cold call, indicações, email)?" },
      { id: "leads_4", catKey: "leads", text: "Você acompanha seu volume de prospecção com metas claras (ex: X contatos por semana)?" },
      { id: "leads_5", catKey: "leads", text: "Você consegue gerar reuniões e oportunidades de forma consistente com sua prospecção?" },
    ],
  },
  {
    category: "Qualificação", catKey: "process", icon: "🔍",
    questions: [
      { id: "process_1", catKey: "process", text: "Você identifica rapidamente se um lead tem potencial real antes de investir muito tempo?" },
      { id: "process_2", catKey: "process", text: "Você usa critérios claros para qualificar (dor, urgência, budget, decisor)?" },
      { id: "process_3", catKey: "process", text: "Você faz perguntas investigativas que revelam a real necessidade do cliente?" },
      { id: "process_4", catKey: "process", text: "Você consegue descualificar leads sem fit sem perder o relacionamento?" },
      { id: "process_5", catKey: "process", text: "Você sabe com quem está falando e se é o decisor ou influenciador da compra?" },
    ],
  },
  {
    category: "Pitch & Proposta", catKey: "value", icon: "💎",
    questions: [
      { id: "value_1", catKey: "value", text: "Você consegue explicar o valor do seu produto/serviço de forma clara em menos de 2 minutos?" },
      { id: "value_2", catKey: "value", text: "Você personaliza sua apresentação para a dor e perfil específico de cada cliente?" },
      { id: "value_3", catKey: "value", text: "Você usa cases de sucesso e provas sociais relevantes nas suas apresentações?" },
      { id: "value_4", catKey: "value", text: "Você consegue diferenciar sua solução da concorrência com argumentos sólidos?" },
      { id: "value_5", catKey: "value", text: "Sua proposta comercial é clara, objetiva e focada no resultado para o cliente?" },
    ],
  },
  {
    category: "Negociação & Objeções", catKey: "team", icon: "🥊",
    questions: [
      { id: "team_1", catKey: "team", text: "Você se sente preparado para lidar com as principais objeções dos clientes?" },
      { id: "team_2", catKey: "team", text: "Você raramente concede desconto sem explorar outras alternativas antes?" },
      { id: "team_3", catKey: "team", text: "Você mantém o valor percebido do produto durante toda a negociação?" },
      { id: "team_4", catKey: "team", text: "Você tem respostas prontas e eficazes para as objeções mais comuns (preço, timing, concorrente)?" },
      { id: "team_5", catKey: "team", text: "Você consegue criar senso de urgência legítimo sem pressionar o cliente?" },
    ],
  },
  {
    category: "Fechamento & Follow-up", catKey: "kpis", icon: "🏁",
    questions: [
      { id: "kpis_1", catKey: "kpis", text: "Você sempre define próximos passos concretos ao final de cada reunião?" },
      { id: "kpis_2", catKey: "kpis", text: "Você tem um processo sistemático de follow-up para oportunidades em aberto?" },
      { id: "kpis_3", catKey: "kpis", text: "Você acompanha todas as suas oportunidades de forma organizada e sem deixar nada cair?" },
      { id: "kpis_4", catKey: "kpis", text: "Sua taxa de conversão de proposta para fechamento está dentro ou acima do esperado?" },
      { id: "kpis_5", catKey: "kpis", text: "Você fecha negócios dentro dos prazos que você mesmo estima?" },
    ],
  },
  {
    category: "Ferramentas & Organização", catKey: "tools", icon: "🔧",
    questions: [
      { id: "tools_1", catKey: "tools", text: "Você registra todas as interações e oportunidades no CRM de forma consistente?" },
      { id: "tools_2", catKey: "tools", text: "Você usa ferramentas digitais para aumentar sua produtividade em vendas (LinkedIn, sequências de e-mail, etc.)?" },
      { id: "tools_3", catKey: "tools", text: "Você organiza sua agenda priorizando atividades de alto impacto comercial?" },
      { id: "tools_4", catKey: "tools", text: "Você monitora suas métricas individuais (ligações, reuniões, propostas, conversões)?" },
      { id: "tools_5", catKey: "tools", text: "Você usa dados para identificar onde está perdendo negócios e ajustar sua abordagem?" },
    ],
  },
  {
    category: "Desenvolvimento Contínuo", catKey: "retention", icon: "📈",
    questions: [
      { id: "retention_1", catKey: "retention", text: "Você se atualiza regularmente sobre técnicas de vendas (livros, cursos, podcasts)?" },
      { id: "retention_2", catKey: "retention", text: "Você pede feedback dos clientes (inclusive dos que não compraram) para melhorar?" },
      { id: "retention_3", catKey: "retention", text: "Você analisa suas perdas para entender o que poderia ter feito diferente?" },
      { id: "retention_4", catKey: "retention", text: "Você tem metas de desenvolvimento pessoal além das metas de resultado?" },
      { id: "retention_5", catKey: "retention", text: "Você pratica e melhora ativamente suas apresentações e scripts de vendas?" },
    ],
  },
];

// Cor de cada resposta quando selecionada (da pior pra melhor)
const SCALE = [
  { value: 20, label: "Nunca",       color: "border-red-300 bg-red-50 text-red-700"          },
  { value: 40, label: "Raramente",   color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: 60, label: "Às vezes",    color: "border-amber-300 bg-amber-50 text-amber-700"    },
  { value: 80, label: "Frequente",   color: "border-blue-300 bg-blue-50 text-blue-700"       },
  { value: 100, label: "Sempre",     color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
];

const SCALE_EMPRESA = [
  { value: 20, label: "Inexistente",       color: "border-red-300 bg-red-50 text-red-700"          },
  { value: 40, label: "Inicial",           color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: 60, label: "Em desenvolvimento",color: "border-amber-300 bg-amber-50 text-amber-700"    },
  { value: 80, label: "Maduro",            color: "border-blue-300 bg-blue-50 text-blue-700"       },
  { value: 100, label: "Referência",       color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
];

const cartao = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const chip = (ativo: boolean) =>
  `px-4 py-2 rounded-full text-sm border transition-colors ${ativo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`;

interface Props {
  isVendedor: boolean;
  hasTeam?: boolean;
  defaultSegment: string;
  defaultCompanyName?: string;
  defaultBusinessModel?: "B2B" | "B2C";
  defaultSubsegment?: string;
  defaultTeamSize?: string;
}

export function NovoScannerForm({
  isVendedor,
  hasTeam = false,
  defaultSegment,
  defaultCompanyName = "",
  defaultBusinessModel = "B2B",
  defaultSubsegment = "",
  defaultTeamSize = "",
}: Props) {
  const router = useRouter();
  const QUESTIONS = isVendedor ? QUESTIONS_VENDEDOR : QUESTIONS_EMPRESA;
  const SCALE_LABELS = isVendedor ? SCALE : SCALE_EMPRESA;
  const TOTAL_QUESTIONS = QUESTIONS.length * 5;

  const [step, setStep] = useState<"info" | "questions" | "sending">("info");
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [businessModel, setBusinessModel] = useState<"B2B" | "B2C">(defaultBusinessModel);
  const [segment, setSegment] = useState(defaultSegment);
  const [subsegment, setSubsegment] = useState(defaultSubsegment);
  const [teamSize, setTeamSize] = useState(defaultTeamSize);

  function handleSegmentChange(s: string) {
    setSegment(s);
    setSubsegment(""); // reset subcategoria ao trocar segmento
  }
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentCat, setCurrentCat] = useState(0);
  const [error, setError] = useState("");

  const currentCategory = QUESTIONS[currentCat];
  const totalAnswered = Object.keys(answers).length;
  const pct = Math.round((totalAnswered / TOTAL_QUESTIONS) * 100);

  function catAnswered(catIdx: number) {
    return QUESTIONS[catIdx].questions.filter((q) => answers[q.id] !== undefined).length;
  }

  function catComplete() {
    return QUESTIONS[currentCat].questions.every((q) => answers[q.id] !== undefined);
  }

  function irPara(i: number) {
    setCurrentCat(i);
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setStep("sending");
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName:   isVendedor ? "Auto-diagnóstico" : companyName,
          businessModel: isVendedor ? "B2B" : businessModel,
          segment,
          subsegment:    isVendedor ? "" : subsegment,
          teamSize:      isVendedor ? "1-5" : teamSize,
          answers,
          diagnosticType: isVendedor ? "VENDEDOR" : "EMPRESA",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      router.push(`/scanner/resultado/${data.id}`);
    } catch (e) {
      setError((e instanceof Error && e.message) || "Não foi possível salvar. Tente novamente.");
      setStep("questions");
    }
  }

  if (step === "sending") {
    return (
      <div className="min-h-full bg-[#f4f6fb] text-slate-900 flex items-center justify-center p-6">
        <div className={`${cartao} text-center space-y-5 max-w-md p-8`}>
          <span className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
            <Loader2 size={30} className="animate-spin" />
          </span>
          <div>
            <p className="text-2xl font-bold">{isVendedor ? "Analisando seu perfil" : "Analisando sua empresa"}</p>
            <p className="text-slate-500 mt-2">
              A IA está gerando seu diagnóstico com pontos de atenção, forças e por onde começar. Leva alguns segundos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "info") {
    const subsegments = segment ? (SUBSEGMENTS[segment] ?? []) : [];
    // Vendedor com equipe: segmento já vem da empresa, não precisa escolher
    const canNext = isVendedor
      ? (hasTeam ? true : !!segment)
      : (!!companyName.trim() && !!segment && !!subsegment && !!teamSize);

    return (
      <div className="min-h-full bg-[#f4f6fb] text-slate-900">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
          <Link href="/scanner" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={15} /> Diagnóstico Comercial
          </Link>

          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-violet-100 p-6 md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Gratuito</span>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
              {isVendedor ? "Auto-diagnóstico de vendas" : "Diagnóstico comercial da empresa"}
            </h1>
            <p className="mt-2 text-slate-600">
              {isVendedor
                ? `${TOTAL_QUESTIONS} perguntas sobre a sua atuação. A IA mostra seus pontos fortes, onde você perde vendas e quais ferramentas usar primeiro.`
                : `${TOTAL_QUESTIONS} perguntas sobre a maturidade comercial da sua empresa. A IA mostra o que trava suas vendas e quais ferramentas usar primeiro.`}
            </p>
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUESTIONS.map((cat) => (
              <div key={cat.catKey} className={`${cartao} flex items-center gap-3 p-3`}>
                <IconeArea chave={cat.catKey} vendedor={isVendedor} tamanho="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{cat.category}</p>
                  <p className="text-xs text-slate-500">5 perguntas</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`${cartao} p-5 md:p-6 space-y-6`}>
            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome da empresa *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Acme Vendas Ltda"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            )}

            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Modelo de negócio *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["B2B", "B2C"] as const).map((bm) => (
                    <button key={bm} type="button" onClick={() => setBusinessModel(bm)}
                      className={`p-4 rounded-xl border text-left transition-colors ${businessModel === bm ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                      <p className={`font-bold text-lg ${businessModel === bm ? "text-blue-700" : "text-slate-900"}`}>{bm}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {bm === "B2B" ? "Vende para outras empresas" : "Vende para consumidor final"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Segmento: locked para vendedor com equipe, selecionável para os demais */}
            {isVendedor && hasTeam ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Empresa da equipe</p>
                <p className="text-sm text-slate-900 font-medium">{defaultCompanyName || "Sua empresa"}</p>
                <p className="text-xs text-slate-600">
                  {segment}{defaultSubsegment ? ` / ${defaultSubsegment}` : ""}
                </p>
                <p className="text-xs text-slate-500 mt-1">O diagnóstico será contextualizado para o segmento da sua empresa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {isVendedor ? "Seu segmento de atuação *" : "Segmento de mercado *"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEGMENTS.map((s) => (
                    <button key={s} type="button" onClick={() => isVendedor ? setSegment(s) : handleSegmentChange(s)} className={chip(segment === s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && segment && subsegments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Categoria dentro de {segment} *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subsegments.map((sub) => (
                    <button key={sub} type="button" onClick={() => setSubsegment(sub)}
                      className={`px-3.5 py-2.5 rounded-xl text-sm border text-left transition-colors ${subsegment === sub ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tamanho da equipe de vendas *</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map((t) => (
                    <button key={t} type="button" onClick={() => setTeamSize(t)} className={chip(teamSize === t)}>
                      {t} pessoas
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && segment && subsegment && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Perfil do diagnóstico</p>
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{businessModel}</span> • {segment} / {subsegment}
                </p>
                <p className="text-xs text-slate-500">As perguntas e a análise serão personalizadas para este perfil.</p>
              </div>
            )}

            <button
              disabled={!canNext}
              onClick={() => setStep("questions")}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors"
            >
              {isVendedor ? "Iniciar auto-diagnóstico" : "Iniciar diagnóstico"} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200/70 px-4 md:px-8 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm text-slate-500 whitespace-nowrap tabular-nums">{totalAnswered}/{TOTAL_QUESTIONS}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {QUESTIONS.map((cat, i) => {
            const done = catAnswered(i) === 5;
            const active = i === currentCat;
            return (
              <button key={cat.catKey} onClick={() => irPara(i)} title={cat.category}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
                  active ? "border-blue-500 bg-white ring-2 ring-blue-500/15" :
                  done ? "border-emerald-200 bg-emerald-50" :
                  "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <IconeArea chave={cat.catKey} vendedor={isVendedor} tamanho="sm" />
                <span className={`text-xs font-medium ${active ? "text-blue-700" : done ? "text-emerald-700" : "text-slate-500"}`}>
                  {done ? <Check size={13} className="inline" /> : `${catAnswered(i)}/5`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <IconeArea chave={currentCategory.catKey} vendedor={isVendedor} tamanho="lg" />
          <div>
            <h2 className="text-xl font-bold">{currentCategory.category}</h2>
            <p className="text-sm text-slate-500">{catAnswered(currentCat)}/5 respondidas</p>
          </div>
        </div>

        <div className="space-y-3">
          {currentCategory.questions.map((q, qi) => (
            <div key={q.id} className={`${cartao} p-5 space-y-4 ${answers[q.id] ? "border-slate-300/80" : ""}`}>
              <div className="flex gap-3">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${answers[q.id] ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {qi + 1}
                </span>
                <p className="text-[15px] text-slate-800 leading-relaxed pt-0.5">{q.text}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SCALE_LABELS.map((s) => (
                  <button key={s.value} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: s.value }))}
                    className={`py-2.5 px-1.5 rounded-xl text-xs font-medium border transition-colors text-center ${
                      answers[q.id] === s.value ? s.color : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pb-8">
          {currentCat > 0 && (
            <button onClick={() => irPara(currentCat - 1)}
              className="inline-flex items-center gap-1.5 px-5 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <ArrowLeft size={16} /> Anterior
            </button>
          )}
          {currentCat < QUESTIONS.length - 1 ? (
            <button onClick={() => irPara(currentCat + 1)} disabled={!catComplete()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors">
              Próxima: {QUESTIONS[currentCat + 1].category} <ArrowRight size={17} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={totalAnswered < TOTAL_QUESTIONS}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors">
              {totalAnswered < TOTAL_QUESTIONS ? `Faltam ${TOTAL_QUESTIONS - totalAnswered} respostas` : <><Sparkles size={17} /> Gerar diagnóstico com IA</>}
            </button>
          )}
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
