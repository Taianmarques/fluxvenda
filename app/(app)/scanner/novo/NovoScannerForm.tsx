"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

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

const SCALE = [
  { value: 20, label: "Nunca",       color: "border-red-700 bg-red-950/40 text-red-300"       },
  { value: 40, label: "Raramente",   color: "border-orange-700 bg-orange-950/40 text-orange-300" },
  { value: 60, label: "Às vezes",    color: "border-yellow-700 bg-yellow-950/40 text-yellow-300" },
  { value: 80, label: "Frequente",   color: "border-blue-700 bg-blue-950/40 text-blue-300"    },
  { value: 100, label: "Sempre",     color: "border-green-700 bg-green-950/40 text-green-300" },
];

const SCALE_EMPRESA = [
  { value: 20, label: "Inexistente",       color: "border-red-700 bg-red-950/40 text-red-300"       },
  { value: 40, label: "Inicial",           color: "border-orange-700 bg-orange-950/40 text-orange-300" },
  { value: 60, label: "Em desenvolvimento",color: "border-yellow-700 bg-yellow-950/40 text-yellow-300" },
  { value: 80, label: "Maduro",            color: "border-blue-700 bg-blue-950/40 text-blue-300"    },
  { value: 100, label: "Referência",       color: "border-green-700 bg-green-950/40 text-green-300" },
];

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
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/scanner/resultado/${id}`);
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
      setStep("questions");
    }
  }

  if (step === "sending") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-7xl animate-bounce">{isVendedor ? "🎯" : "🤖"}</div>
          <div>
            <p className="text-2xl font-bold">
              {isVendedor ? "Analisando seu perfil" : "Analisando sua empresa"}
            </p>
            <p className="text-gray-400 mt-2">
              A IA está gerando seu diagnóstico personalizado com pontos de atenção, forças e um plano de desenvolvimento...
            </p>
          </div>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
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
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="text-5xl">{isVendedor ? "🎯" : "📊"}</span>
            <h1 className="text-3xl font-bold">
              {isVendedor ? "Auto-diagnóstico de Vendas" : "Scanner Empresarial"}
            </h1>
            <p className="text-gray-400">
              {isVendedor
                ? "35 perguntas sobre sua atuação individual. A IA identifica seus pontos fortes, onde você está deixando dinheiro na mesa, e gera um plano de evolução personalizado."
                : "Diagnóstico completo em 35 perguntas. A IA analisa a maturidade comercial da sua empresa e gera um plano de ação personalizado."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUESTIONS.map((cat) => (
              <div key={cat.catKey} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium">{cat.category}</p>
                  <p className="text-xs text-gray-500">5 perguntas</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Nome da empresa *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Acme Vendas Ltda"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Modelo de negócio *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["B2B", "B2C"] as const).map((bm) => (
                    <button key={bm} type="button" onClick={() => setBusinessModel(bm)}
                      className={`p-4 rounded-xl border text-left transition-all ${businessModel === bm ? "border-blue-500 bg-blue-950/40" : "border-gray-700 hover:border-gray-600 bg-gray-900"}`}>
                      <p className={`font-bold text-lg ${businessModel === bm ? "text-blue-300" : "text-white"}`}>{bm}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {bm === "B2B" ? "Vende para outras empresas" : "Vende para consumidor final"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Segmento: locked para vendedor com equipe, selecionável para os demais */}
            {isVendedor && hasTeam ? (
              <div className="bg-green-950/20 border border-green-800/50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Empresa da equipe</p>
                <p className="text-sm text-gray-200 font-medium">{defaultCompanyName || "Sua empresa"}</p>
                <p className="text-xs text-gray-400">
                  {segment}{defaultSubsegment ? ` / ${defaultSubsegment}` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">O diagnóstico será contextualizado para o segmento da sua empresa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {isVendedor ? "Seu segmento de atuação *" : "Segmento de mercado *"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEGMENTS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => isVendedor ? setSegment(s) : handleSegmentChange(s)}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${segment === s ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && segment && subsegments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Categoria dentro de {segment} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {subsegments.map((sub) => (
                    <button key={sub} type="button" onClick={() => setSubsegment(sub)}
                      className={`px-3 py-2.5 rounded-xl text-sm border text-left transition-all ${subsegment === sub ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500 bg-gray-900/50"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Tamanho da equipe de vendas *</label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_SIZES.map((t) => (
                    <button key={t} type="button" onClick={() => setTeamSize(t)}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${teamSize === t ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                      {t} pessoas
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isVendedor && segment && subsegment && (
              <div className="bg-blue-950/20 border border-blue-800/50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Perfil do diagnóstico</p>
                <p className="text-sm text-gray-200">
                  <span className="font-semibold">{businessModel}</span> • {segment} / {subsegment}
                </p>
                <p className="text-xs text-gray-500">As perguntas e análise serão personalizadas para este perfil.</p>
              </div>
            )}

            <button
              disabled={!canNext}
              onClick={() => setStep("questions")}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors"
            >
              {isVendedor ? "Iniciar auto-diagnóstico →" : "Iniciar diagnóstico →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm text-gray-400 whitespace-nowrap">{totalAnswered}/{TOTAL_QUESTIONS}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-4 gap-2">
          {QUESTIONS.map((cat, i) => {
            const done = catAnswered(i) === 5;
            const active = i === currentCat;
            return (
              <button key={cat.catKey} onClick={() => setCurrentCat(i)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  active ? "border-blue-500 bg-blue-950/40" :
                  done ? "border-green-700 bg-green-950/30" :
                  "border-gray-800 hover:border-gray-600"
                }`}>
                <div className="text-xl">{cat.icon}</div>
                <div className={`text-xs mt-1 ${active ? "text-blue-300" : done ? "text-green-400" : "text-gray-500"}`}>
                  {done ? "✓" : `${catAnswered(i)}/5`}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentCategory.icon}</span>
          <div>
            <h2 className="text-xl font-bold">{currentCategory.category}</h2>
            <p className="text-sm text-gray-400">{catAnswered(currentCat)}/5 respondidas</p>
          </div>
        </div>

        <div className="space-y-4">
          {currentCategory.questions.map((q, qi) => (
            <div key={q.id} className={`bg-gray-900 border rounded-2xl p-5 space-y-4 transition-all ${answers[q.id] ? "border-gray-700" : "border-gray-800"}`}>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                  {qi + 1}
                </span>
                <p className="text-sm text-gray-200 leading-relaxed pt-0.5">{q.text}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {SCALE_LABELS.map((s) => (
                  <button key={s.value} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: s.value }))}
                    className={`py-2.5 px-1 rounded-xl text-xs font-medium border transition-all text-center ${
                      answers[q.id] === s.value ? s.color : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
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
            <button onClick={() => setCurrentCat(currentCat - 1)}
              className="px-5 py-3 border border-gray-700 rounded-xl text-sm hover:border-gray-500 transition-colors">
              ← Anterior
            </button>
          )}
          {currentCat < QUESTIONS.length - 1 ? (
            <button onClick={() => setCurrentCat(currentCat + 1)} disabled={!catComplete()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors">
              Próxima: {QUESTIONS[currentCat + 1].category} →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={totalAnswered < TOTAL_QUESTIONS}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all">
              {totalAnswered < TOTAL_QUESTIONS ? `Faltam ${TOTAL_QUESTIONS - totalAnswered} respostas` : "🤖 Gerar diagnóstico com IA"}
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
