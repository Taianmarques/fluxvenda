import Link from "next/link";
import { ArrowRight, ChevronRight, Compass, Plus } from "lucide-react";
import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

// Diagnóstico Comercial — a única parte gratuita: qualquer conta acessa (sem ProductGate).
// O resultado sugere por onde começar na biblioteca (lib/diagnostico-recomendacoes.ts).
export default async function ScannerPage() {
  const user = await currentUser();

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    select: { role: true, teamMembership: { select: { team: { select: { managerId: true, name: true } } } } },
  });

  const isGestor = profile?.role === "GESTOR" || profile?.role === "ADMIN";

  // Diagnósticos próprios
  const myDiagnostics = await prisma.diagnostic.findMany({
    where: { profileId: user!.id },
    orderBy: { createdAt: "desc" },
    include: { result: true },
    take: 10,
  });

  // Diagnóstico do gestor da equipe (para vendedores)
  const gestorDiagnostic = !isGestor && profile?.teamMembership?.team?.managerId
    ? await prisma.diagnostic.findFirst({
        where: { profileId: profile.teamMembership.team.managerId },
        orderBy: { createdAt: "desc" },
        include: { result: true },
      })
    : null;

  const teamName = profile?.teamMembership?.team?.name;

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-7">

      {/* Topo */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-violet-100 p-6 md:p-8">
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Gratuito</span>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Compass size={28} className="text-blue-600" /> Diagnóstico Comercial
            </h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              {isGestor
                ? "Descubra o que trava as vendas da sua empresa e receba as ferramentas certas para usar primeiro."
                : "Avalie sua maturidade em vendas e receba as ferramentas certas para usar primeiro."}
            </p>
          </div>
          <Link href="/scanner/novo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 flex-shrink-0">
            <Plus size={17} /> {isGestor ? "Novo diagnóstico da empresa" : "Fazer auto-diagnóstico"}
          </Link>
        </div>
      </section>

      {/* Diagnóstico da empresa (para vendedores que têm gestor) */}
      {gestorDiagnostic && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Diagnóstico da empresa</h2>
            {teamName && <span className="text-xs text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{teamName}</span>}
          </div>
          <Linha d={gestorDiagnostic} destaque />
        </section>
      )}

      {/* Meus diagnósticos */}
      <section className="space-y-3">
        {myDiagnostics.length > 0 && (
          <h2 className="text-lg font-bold">{isGestor ? "Histórico de diagnósticos" : "Meus auto-diagnósticos"}</h2>
        )}

        {myDiagnostics.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center space-y-4">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Compass size={26} /></span>
            <p className="text-lg font-semibold">{isGestor ? "Nenhum diagnóstico ainda" : "Você ainda não fez um auto-diagnóstico"}</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {isGestor
                ? "Responda as perguntas sobre a maturidade comercial da sua empresa. Em poucos minutos você vê os pontos críticos e por onde começar."
                : "O auto-diagnóstico avalia sua atuação em vendas: prospecção, qualificação, negociação, fechamento e mais."}
            </p>
            <Link href="/scanner/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">
              {isGestor ? "Iniciar diagnóstico da empresa" : "Iniciar auto-diagnóstico"} <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myDiagnostics.map(d => <Linha key={d.id} d={d} />)}
          </div>
        )}
      </section>

    </div>
    </div>
  );
}

const PRIORIDADE: Record<string, { label: string; fundo: string; texto: string; etiqueta: string }> = {
  CRITICO: { label: "Crítico", fundo: "bg-red-50", texto: "text-red-600", etiqueta: "bg-red-50 text-red-700" },
  ATENCAO: { label: "Atenção", fundo: "bg-amber-50", texto: "text-amber-600", etiqueta: "bg-amber-50 text-amber-700" },
  BOM: { label: "Bom", fundo: "bg-blue-50", texto: "text-blue-600", etiqueta: "bg-blue-50 text-blue-700" },
  EXCELENTE: { label: "Excelente", fundo: "bg-emerald-50", texto: "text-emerald-600", etiqueta: "bg-emerald-50 text-emerald-700" },
};

type LinhaDiagnostico = {
  id: string; scoreTotal: number; diagnosticType: string; companyName: string; segment: string; teamSize: string;
  createdAt: Date; result: { priority: string } | null;
};

function Linha({ d, destaque = false }: { d: LinhaDiagnostico; destaque?: boolean }) {
  const p = PRIORIDADE[d.result?.priority ?? ""] ?? PRIORIDADE.ATENCAO;
  return (
    <Link href={`/scanner/resultado/${d.id}`}
      className={`group flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 md:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition ${destaque ? "border-blue-200" : "border-slate-200/80 hover:border-slate-300"}`}>
      <div className="flex items-center gap-4 min-w-0">
        <span className={`w-14 h-14 rounded-2xl ${p.fundo} flex flex-col items-center justify-center flex-shrink-0`}>
          <span className={`text-xl font-bold leading-none tabular-nums ${p.texto}`}>{d.scoreTotal}</span>
          <span className="text-[10px] text-slate-500 mt-0.5">pontos</span>
        </span>
        <div className="min-w-0">
          <p className="font-semibold truncate">{d.diagnosticType === "VENDEDOR" ? "Auto-diagnóstico de vendas" : d.companyName}</p>
          <p className="text-sm text-slate-500 truncate">{d.diagnosticType === "VENDEDOR" ? d.segment : `${d.segment} • ${d.teamSize} pessoas`}</p>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(d.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {d.result && <span className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-lg font-medium ${p.etiqueta}`}>{p.label}</span>}
        <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
