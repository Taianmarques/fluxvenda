"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";
import { AuthLogo } from "@/app/AuthLogo";

const TEAM_SIZES = ["1-5", "6-15", "16-50", "51-200", "200+"];
const PAGE_BG = "min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900";

type Step = "role" | "company" | "vendedor" | "funcionario" | "membro";
type BusinessModel = "B2B" | "B2C";
type SoldProduct = "CRM" | "PLATAFORMA";
export type OnboardingVariant = "crm" | "plataforma" | "generic" | "membro";

// "membro" nunca chega no passo company — o copy só existe pras variantes de gestor
const COMPANY_COPY: Record<Exclude<OnboardingVariant, "membro">, { title: string; subtitle: string; button: string }> = {
  crm: {
    title: "Configure sua empresa",
    subtitle: "Essas informações preparam o agente de WhatsApp e o CRM da sua equipe. Seu teste grátis de 7 dias começa assim que você criar a empresa.",
    button: "Começar teste grátis de 7 dias",
  },
  plataforma: {
    title: "Dados da sua empresa",
    subtitle: "Essas informações personalizam o diagnóstico e os cenários de treino para a realidade da sua empresa.",
    button: "Criar empresa e acessar painel",
  },
  generic: {
    title: "Dados da sua empresa",
    subtitle: "Essas informações personalizam o diagnóstico e os cenários de treino para a realidade da sua empresa.",
    button: "Criar empresa e acessar painel",
  },
};

// teamName/memberDestino/memberRole: só na variante "membro" (convidado que já entrou numa
// equipe pelo link — onboarding mínimo, sem escolha de papel/produtos)
type MemberProps = { teamName?: string; memberDestino?: string; memberRole?: "VENDEDOR" | "FUNCIONARIO" };

export function OnboardingFlow({ variant, ...memberProps }: { variant: OnboardingVariant } & MemberProps) {
  return (
    <Suspense fallback={null}>
      <OnboardingForm variant={variant} {...memberProps} />
    </Suspense>
  );
}

function OnboardingForm({ variant, teamName, memberDestino, memberRole }: { variant: OnboardingVariant } & MemberProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // CRM: sempre quem contratou é o gestor — pula a escolha de papel e vai direto pra empresa
  const [step, setStep] = useState<Step>(variant === "crm" ? "company" : variant === "membro" ? "membro" : "role");
  const [role, setRole] = useState<"GESTOR" | "VENDEDOR" | "FUNCIONARIO" | "">(
    variant === "crm" ? "GESTOR" : variant === "membro" ? (memberRole ?? "FUNCIONARIO") : ""
  );

  // Gestor fields
  const [companyName, setCompanyName] = useState("");
  const [businessModel, setBusinessModel] = useState<BusinessModel>("B2B");
  const [segment, setSegment] = useState("");
  const [subsegment, setSubsegment] = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Produtos contratados — fixo conforme a landing de origem (crm/plataforma); no fluxo
  // genérico (sem landing dedicada) o usuário escolhe, pré-selecionado por ?product= se vier
  const productParam = searchParams.get("product");
  const [products, setProducts] = useState<Set<SoldProduct>>(() => {
    if (variant === "crm") return new Set(["CRM"]);
    if (variant === "plataforma") return new Set(["PLATAFORMA"]);
    if (productParam === "crm") return new Set(["CRM"]);
    if (productParam === "plataforma") return new Set(["PLATAFORMA"]);
    return new Set(["CRM", "PLATAFORMA"]);
  });
  function toggleProduct(p: SoldProduct) {
    setProducts(prev => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size > 1) next.delete(p); } else next.add(p);
      return next;
    });
  }

  // Vendedor fields
  const [vendSegment, setVendSegment] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSegmentChange(s: string) {
    setSegment(s);
    setSubsegment("");
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          companyName:   role === "GESTOR" ? companyName.trim() : undefined,
          businessModel: role === "GESTOR" ? businessModel : undefined,
          segment:       role === "GESTOR" ? segment : role === "VENDEDOR" ? vendSegment : undefined,
          subsegment:    role === "GESTOR" ? subsegment : undefined,
          teamSize:      role === "GESTOR" ? teamSize : undefined,
          products:      role === "GESTOR" ? Array.from(products) : undefined,
          inviteCode:    (role === "VENDEDOR" || role === "FUNCIONARIO") && inviteCode.trim() ? inviteCode.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao salvar");
      }

      await res.json();

      if (variant === "membro") {
        // Convidado: já é membro da equipe — cai direto no produto dela (CRM ou dashboard)
        router.push(memberDestino ?? "/dashboard");
      } else if (role === "GESTOR") {
        // Time sem Plataforma (só CRM) não tem acesso a /gestor — cai direto no CRM (que
        // manda pro Hub de agentes quando ainda não tem nenhum criado), sem passar pela
        // casca da Plataforma.
        router.push(products.has("PLATAFORMA") ? "/gestor" : "/crm");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  }

  // ── STEP: membro convidado (já entrou na equipe pelo link) — só confirmar ─
  if (step === "membro") {
    return (
      <div className={`${PAGE_BG} flex items-center justify-center px-4`}>
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <AuthLogo />
            <p className="text-gray-500 text-sm pt-2">Bem-vindo(a) à equipe</p>
            <p className="text-3xl font-bold text-gray-900">{teamName ?? "Sua equipe"}</p>
            <p className="text-gray-500">Só falta um passo pra começar a atender.</p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-4">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-lg text-white transition-colors"
            >
              {saving ? "Entrando..." : memberDestino === "/crm" ? "Concluir e abrir o CRM" : "Concluir e acessar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: escolha de role (pulado no fluxo do CRM) ──────────────────────
  if (step === "role") {
    return (
      <div className={`${PAGE_BG} flex items-center justify-center px-4 py-10`}>
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <AuthLogo />
            <p className="text-3xl font-bold text-gray-900 pt-2">Bem-vindo(a)!</p>
            <p className="text-gray-500">Qual é o seu papel na empresa?</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* GESTOR */}
            <button onClick={() => { setRole("GESTOR"); setStep("company"); }}
              className="p-6 rounded-2xl border border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50/60 shadow-sm text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏢</div>
                <div>
                  <p className="text-lg font-bold text-gray-900">Sou Gestor / Diretor</p>
                  <p className="text-gray-500 text-sm mt-1">Gerencio uma equipe de vendas. Vou cadastrar minha empresa e convidar meu time.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Dashboard da equipe", "Convites", "Relatórios"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* VENDEDOR */}
            <button onClick={() => { setRole("VENDEDOR"); setStep("vendedor"); }}
              className="p-6 rounded-2xl border border-gray-200 hover:border-green-400 bg-white hover:bg-green-50/60 shadow-sm text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎯</div>
                <div>
                  <p className="text-lg font-bold text-gray-900">Sou Vendedor(a)</p>
                  <p className="text-gray-500 text-sm mt-1">Faço parte de uma equipe de vendas ou quero me desenvolver de forma individual.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Treinamentos", "Simulações", "Ranking"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* FUNCIONARIO */}
            <button onClick={() => { setRole("FUNCIONARIO"); setStep("funcionario"); }}
              className="p-6 rounded-2xl border border-gray-200 hover:border-orange-400 bg-white hover:bg-orange-50/60 shadow-sm text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🪪</div>
                <div>
                  <p className="text-lg font-bold text-gray-900">Sou Funcionário</p>
                  <p className="text-gray-500 text-sm mt-1">Recebi um convite para acessar a plataforma. Vou inserir meu código de acesso.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Acesso via convite", "Treinamentos", "Simulações"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full border border-orange-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: gestor — dados da empresa ─────────────────────────────────────
  if (step === "company") {
    const subsegments = segment ? (SUBSEGMENTS[segment] ?? []) : [];
    // CRM: fluxo enxuto, sem categoria dentro do segmento nem escolha de produto
    // (quem chega por aqui já contratou CRM — não tem o que escolher).
    const canNext = companyName.trim() && segment && teamSize && (variant === "crm" || subsegment);
    const copy = COMPANY_COPY[variant === "membro" ? "generic" : variant];

    return (
      <div className={`${PAGE_BG} flex items-center justify-center p-6 py-10`}>
        <div className="w-full max-w-xl space-y-7">

          <div className="text-center">
            <AuthLogo size={32} />
          </div>

          {variant !== "crm" && (
            <div className="flex items-center gap-3">
              <button onClick={() => setStep("role")} className="text-gray-400 hover:text-gray-700 transition-colors">← Voltar</button>
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-blue-500 rounded-full" />
              </div>
              <span className="text-xs text-gray-400">2/2</span>
            </div>
          )}

          <div>
            <p className="text-2xl font-bold text-gray-900">{copy.title}</p>
            <p className="text-gray-500 text-sm mt-1">{copy.subtitle}</p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-6">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nome da empresa *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: VendaMais Soluções Ltda"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Modelo de negócio *</label>
              <div className="grid grid-cols-2 gap-3">
                {(["B2B", "B2C"] as BusinessModel[]).map(bm => (
                  <button key={bm} type="button" onClick={() => setBusinessModel(bm)}
                    className={`p-4 rounded-xl border text-left transition-all ${businessModel === bm ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                    <p className={`font-bold text-lg ${businessModel === bm ? "text-blue-700" : "text-gray-900"}`}>{bm}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {bm === "B2B" ? "Vende para outras empresas" : "Vende para consumidor final"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {variant === "generic" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">O que vocês contrataram? *</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: "CRM" as const, title: "CRM", desc: "Agente de WhatsApp com IA + atendimento" },
                    { key: "PLATAFORMA" as const, title: "Plataforma", desc: "Scanner, trilhas, simulações e treinamento" },
                  ]).map(p => (
                    <button key={p.key} type="button" onClick={() => toggleProduct(p.key)}
                      className={`p-4 rounded-xl border text-left transition-all ${products.has(p.key) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                      <p className={`font-bold ${products.has(p.key) ? "text-blue-700" : "text-gray-900"}`}>{p.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">Pode marcar os dois — dá pra ajustar depois com o suporte.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Segmento de mercado *</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(s => (
                  <button key={s} type="button" onClick={() => handleSegmentChange(s)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${segment === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {variant !== "crm" && segment && subsegments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Categoria dentro de {segment} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {subsegments.map(sub => (
                    <button key={sub} type="button" onClick={() => setSubsegment(sub)}
                      className={`px-3 py-2.5 rounded-xl text-sm border text-left transition-all ${subsegment === sub ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tamanho da equipe de vendas *</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map(t => (
                  <button key={t} type="button" onClick={() => setTeamSize(t)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${teamSize === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}>
                    {t} pessoas
                  </button>
                ))}
              </div>
            </div>

            {segment && businessModel && (variant === "crm" || subsegment) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Perfil da empresa</p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{businessModel}</span> • {segment}{subsegment ? ` / ${subsegment}` : ""}
                </p>
                <p className="text-xs text-gray-500">O diagnóstico e os treinamentos serão personalizados para este perfil.</p>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg text-white transition-colors">
              {saving ? "Criando empresa..." : copy.button}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: vendedor ────────────────────────────────────────────────────────
  if (step === "vendedor") {
    const canNext = vendSegment;
    return (
      <div className={`${PAGE_BG} flex items-center justify-center px-4 py-10`}>
        <div className="w-full max-w-lg space-y-7">
          <div className="text-center">
            <AuthLogo size={32} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("role")} className="text-gray-400 hover:text-gray-700 transition-colors">← Voltar</button>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-green-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-400">2/2</span>
          </div>

          <div>
            <p className="text-2xl font-bold text-gray-900">Seu perfil de vendas</p>
            <p className="text-gray-500 text-sm mt-1">Personalizamos o conteúdo e os desafios para o seu segmento.</p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Seu segmento de atuação *</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(s => (
                  <button key={s} type="button" onClick={() => setVendSegment(s)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${vendSegment === s ? "border-green-500 bg-green-50 text-green-700" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Código de convite da equipe <span className="text-gray-400">(opcional)</span></label>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                placeholder="Cole o código que seu gestor te enviou"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors font-mono text-sm" />
              <p className="text-xs text-gray-400">Se não tiver agora, pode entrar em uma equipe depois pelo link do seu gestor.</p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg text-white transition-colors">
              {saving ? "Salvando..." : "Começar treinamento"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: funcionario ─────────────────────────────────────────────────────
  if (step === "funcionario") {
    const canNext = inviteCode.trim().length > 0;
    return (
      <div className={`${PAGE_BG} flex items-center justify-center px-4 py-10`}>
        <div className="w-full max-w-lg space-y-7">
          <div className="text-center">
            <AuthLogo size={32} />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("role")} className="text-gray-400 hover:text-gray-700 transition-colors">← Voltar</button>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-orange-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-400">2/2</span>
          </div>

          <div>
            <p className="text-2xl font-bold text-gray-900">Insira seu código de acesso</p>
            <p className="text-gray-500 text-sm mt-1">Você recebeu um código de convite do seu gestor. Cole ele abaixo para acessar a plataforma.</p>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-5">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Código de convite *</label>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                placeholder="Cole o código que seu gestor te enviou"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-mono text-sm" />
              <p className="text-xs text-gray-400">Peça o código de acesso para o responsável pela sua equipe.</p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg text-white transition-colors">
              {saving ? "Verificando código..." : "Acessar plataforma"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
