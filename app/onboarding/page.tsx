"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

const TEAM_SIZES = ["1-5", "6-15", "16-50", "51-200", "200+"];

type Step = "role" | "company" | "vendedor" | "funcionario";
type BusinessModel = "B2B" | "B2C";
type SoldProduct = "CRM" | "PLATAFORMA";

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const { user } = useUser();
  const { session } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"GESTOR" | "VENDEDOR" | "FUNCIONARIO" | "">("");

  // Gestor fields
  const [companyName, setCompanyName] = useState("");
  const [businessModel, setBusinessModel] = useState<BusinessModel>("B2B");
  const [segment, setSegment] = useState("");
  const [subsegment, setSubsegment] = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Produtos contratados (CRM / Plataforma) — pré-selecionado conforme ?product= vindo da
  // landing page de origem; sem indicação, assume os dois (comportamento histórico)
  const productParam = searchParams.get("product");
  const [products, setProducts] = useState<Set<SoldProduct>>(() => {
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

  // Compartilhado
  const [phone, setPhone] = useState("");

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
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Usuário";
      const email = user?.emailAddresses[0]?.emailAddress;

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          email,
          phone:         phone.trim() || undefined,
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

      const data = await res.json();
      try { await session?.reload(); } catch {}

      if (role === "GESTOR") {
        router.push("/gestor");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  }

  // ── STEP: escolha de role ────────────────────────────────────────────────
  if (step === "role") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <p className="text-4xl">👋</p>
            <h1 className="text-3xl font-bold">Bem-vindo(a)!</h1>
            <p className="text-gray-400">Qual é o seu papel na empresa?</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* GESTOR */}
            <button onClick={() => { setRole("GESTOR"); setStep("company"); }}
              className="p-6 rounded-2xl border border-gray-700 hover:border-blue-500 bg-gray-900 hover:bg-blue-950/20 text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-900/40 border border-blue-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏢</div>
                <div>
                  <p className="text-lg font-bold">Sou Gestor / Diretor</p>
                  <p className="text-gray-400 text-sm mt-1">Gerencio uma equipe de vendas. Vou cadastrar minha empresa e convidar meu time.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Dashboard da equipe", "Convites", "Relatórios"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded-full border border-blue-800">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* VENDEDOR */}
            <button onClick={() => { setRole("VENDEDOR"); setStep("vendedor"); }}
              className="p-6 rounded-2xl border border-gray-700 hover:border-green-500 bg-gray-900 hover:bg-green-950/20 text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-900/40 border border-green-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎯</div>
                <div>
                  <p className="text-lg font-bold">Sou Vendedor(a)</p>
                  <p className="text-gray-400 text-sm mt-1">Faço parte de uma equipe de vendas ou quero me desenvolver de forma individual.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Treinamentos", "Simulações", "Ranking"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-green-900/40 text-green-300 rounded-full border border-green-800">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {/* FUNCIONARIO */}
            <button onClick={() => { setRole("FUNCIONARIO"); setStep("funcionario"); }}
              className="p-6 rounded-2xl border border-gray-700 hover:border-orange-500 bg-gray-900 hover:bg-orange-950/20 text-left transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-900/40 border border-orange-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🪪</div>
                <div>
                  <p className="text-lg font-bold">Sou Funcionário</p>
                  <p className="text-gray-400 text-sm mt-1">Recebi um convite para acessar a plataforma. Vou inserir meu código de acesso.</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {["Acesso via convite", "Treinamentos", "Simulações"].map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-orange-900/40 text-orange-300 rounded-full border border-orange-800">{t}</span>
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
    const canNext = companyName.trim() && segment && subsegment && teamSize;

    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-xl mx-auto space-y-7">

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("role")} className="text-gray-500 hover:text-white transition-colors">← Voltar</button>
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-blue-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">2/2</span>
          </div>

          <div>
            <p className="text-2xl font-bold">Dados da sua empresa</p>
            <p className="text-gray-400 text-sm mt-1">Essas informações personalizam o diagnóstico e os cenários de treino para a realidade da sua empresa.</p>
          </div>

          <div className="space-y-6">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Nome da empresa *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: VendaMais Soluções Ltda"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Modelo de negócio *</label>
              <div className="grid grid-cols-2 gap-3">
                {(["B2B", "B2C"] as BusinessModel[]).map(bm => (
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">O que vocês contrataram? *</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "CRM" as const, title: "CRM", desc: "Agente de WhatsApp com IA + atendimento" },
                  { key: "PLATAFORMA" as const, title: "Plataforma", desc: "Scanner, trilhas, simulações e treinamento" },
                ]).map(p => (
                  <button key={p.key} type="button" onClick={() => toggleProduct(p.key)}
                    className={`p-4 rounded-xl border text-left transition-all ${products.has(p.key) ? "border-blue-500 bg-blue-950/40" : "border-gray-700 hover:border-gray-600 bg-gray-900"}`}>
                    <p className={`font-bold ${products.has(p.key) ? "text-blue-300" : "text-white"}`}>{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Pode marcar os dois — dá pra ajustar depois com o suporte.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Segmento de mercado *</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(s => (
                  <button key={s} type="button" onClick={() => handleSegmentChange(s)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${segment === s ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {segment && subsegments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Categoria dentro de {segment} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {subsegments.map(sub => (
                    <button key={sub} type="button" onClick={() => setSubsegment(sub)}
                      className={`px-3 py-2.5 rounded-xl text-sm border text-left transition-all ${subsegment === sub ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500 bg-gray-900/50"}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tamanho da equipe de vendas *</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map(t => (
                  <button key={t} type="button" onClick={() => setTeamSize(t)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${teamSize === t ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {t} pessoas
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">WhatsApp <span className="text-gray-500">(opcional)</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999" type="tel"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
              <p className="text-xs text-gray-500">Você receberá uma mensagem de boas-vindas no WhatsApp.</p>
            </div>

            {segment && subsegment && businessModel && (
              <div className="bg-blue-950/20 border border-blue-800/50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Perfil da empresa</p>
                <p className="text-sm text-gray-200">
                  <span className="font-semibold">{businessModel}</span> • {segment} / {subsegment}
                </p>
                <p className="text-xs text-gray-500">O diagnóstico e os treinamentos serão personalizados para este perfil.</p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors">
              {saving ? "Criando empresa..." : "🏢 Criar empresa e acessar painel"}
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("role")} className="text-gray-500 hover:text-white transition-colors">← Voltar</button>
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-green-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">2/2</span>
          </div>

          <div>
            <p className="text-2xl font-bold">Seu perfil de vendas</p>
            <p className="text-gray-400 text-sm mt-1">Personalizamos o conteúdo e os desafios para o seu segmento.</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Seu segmento de atuação *</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(s => (
                  <button key={s} type="button" onClick={() => setVendSegment(s)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${vendSegment === s ? "border-green-500 bg-green-950/40 text-green-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Código de convite da equipe <span className="text-gray-500">(opcional)</span></label>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                placeholder="Cole o código que seu gestor te enviou"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors font-mono text-sm" />
              <p className="text-xs text-gray-500">Se não tiver agora, pode entrar em uma equipe depois pelo link do seu gestor.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">WhatsApp <span className="text-gray-500">(opcional)</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999" type="tel"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors" />
              <p className="text-xs text-gray-500">Você receberá uma mensagem de boas-vindas no WhatsApp.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors">
              {saving ? "Salvando..." : "🎯 Começar treinamento"}
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("role")} className="text-gray-500 hover:text-white transition-colors">← Voltar</button>
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-orange-500 rounded-full" />
            </div>
            <span className="text-xs text-gray-500">2/2</span>
          </div>

          <div>
            <p className="text-2xl font-bold">Insira seu código de acesso</p>
            <p className="text-gray-400 text-sm mt-1">Você recebeu um código de convite do seu gestor. Cole ele abaixo para acessar a plataforma.</p>
          </div>

          <div className="space-y-5">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Código de convite *</label>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                placeholder="Cole o código que seu gestor te enviou"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors font-mono text-sm" />
              <p className="text-xs text-gray-500">Peça o código de acesso para o responsável pela sua equipe.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">WhatsApp <span className="text-gray-500">(opcional)</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999" type="tel"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors" />
              <p className="text-xs text-gray-500">Você receberá uma mensagem de boas-vindas no WhatsApp.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={submit} disabled={!canNext || saving}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors">
              {saving ? "Verificando código..." : "🪪 Acessar plataforma"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
