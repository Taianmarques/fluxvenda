import Link from "next/link";
import { CalendarCheck, CheckCircle2, XCircle, Percent, Stethoscope, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { AgentConfig } from "@/app/generated/prisma/client";
import { WeeklyBarChart } from "./DashboardCharts";
import { DAY_MS } from "./dashboard-utils";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
};
const STATUS_COLOR: Record<string, string> = {
  CONFIRMADO: "#3b82f6",
  CANCELADO: "#ef4444",
  CONCLUIDO: "#22c55e",
  AGUARDANDO_PAGAMENTO: "#f59e0b",
};

export async function AgendamentosTab({ agentId, config }: { agentId: string; config: AgentConfig }) {
  if (!config.schedulingEnabled) {
    return (
      <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-4">
        <CalendarCheck size={40} className="mx-auto text-gray-600" />
        <div>
          <p className="font-semibold">Agendamentos não configurados</p>
          <p className="text-sm text-gray-500 mt-1">Ative o agendamento na página Agenda para começar a receber marcações e ver os dados aqui.</p>
        </div>
        <Link href={`/crm/${agentId}/agenda`} className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium">
          Ir para Agenda
        </Link>
      </div>
    );
  }

  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: { agentConfigId: config.id },
    orderBy: { scheduledAt: "asc" },
    include: {
      professional: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  const proximos = appointments.filter(a => a.status === "CONFIRMADO" && a.scheduledAt >= now);
  const concluidos = appointments.filter(a => a.status === "CONCLUIDO");
  const cancelados = appointments.filter(a => a.status === "CANCELADO");
  const aguardandoPagamento = appointments.filter(a => a.status === "AGUARDANDO_PAGAMENTO");
  const finalizados = concluidos.length + cancelados.length;
  const taxaCancelamento = finalizados > 0 ? cancelados.length / finalizados : null;

  const statusCounts = [
    { status: "CONFIRMADO", count: appointments.filter(a => a.status === "CONFIRMADO").length },
    { status: "CONCLUIDO", count: concluidos.length },
    { status: "CANCELADO", count: cancelados.length },
    { status: "AGUARDANDO_PAGAMENTO", count: aguardandoPagamento.length },
  ].filter(s => s.count > 0);
  const statusMax = Math.max(1, ...statusCounts.map(s => s.count));

  // Por profissional
  const profMap = new Map<string, number>();
  for (const a of appointments) {
    if (!a.professional) continue;
    profMap.set(a.professional.name, (profMap.get(a.professional.name) ?? 0) + 1);
  }
  const byProfessional = Array.from(profMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const profMax = Math.max(1, ...byProfessional.map(p => p.count));

  // Por serviço
  const serviceMap = new Map<string, number>();
  for (const a of appointments) {
    if (!a.service) continue;
    serviceMap.set(a.service.name, (serviceMap.get(a.service.name) ?? 0) + 1);
  }
  const byService = Array.from(serviceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const serviceMax = Math.max(1, ...byService.map(s => s.count));

  // Agendamentos criados por semana (últimas 8)
  const weekBuckets = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now.getTime() - (7 - i - 1) * 7 * DAY_MS);
    const start = new Date(end.getTime() - 7 * DAY_MS);
    return { start, end, total: 0, semana: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
  });
  for (const a of appointments) {
    const bucket = weekBuckets.find(w => a.createdAt >= w.start && a.createdAt < w.end);
    if (bucket) bucket.total += 1;
  }

  const proximosList = proximos.slice(0, 8);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400 mb-2"><CalendarCheck size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400 break-words">{proximos.length}</p>
          <p className="text-xs text-gray-500 mt-1">Próximos confirmados</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400 mb-2"><CheckCircle2 size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 break-words">{concluidos.length}</p>
          <p className="text-xs text-gray-500 mt-1">Concluídos</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-red-500/10 text-red-400 mb-2"><XCircle size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400 break-words">{cancelados.length}</p>
          <p className="text-xs text-gray-500 mt-1">Cancelados</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
          <span className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-2"><Percent size={18} /></span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-400 break-words">{taxaCancelamento === null ? "—" : `${(taxaCancelamento * 100).toFixed(0)}%`}</p>
          <p className="text-xs text-gray-500 mt-1">Taxa de cancelamento</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <p className="font-semibold">Agendamentos criados por semana</p>
        <WeeklyBarChart data={weekBuckets.map(w => ({ semana: w.semana, total: w.total }))} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="font-semibold">Por status</p>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum agendamento ainda.</p>
          ) : (
            <div className="space-y-2">
              {statusCounts.map(s => (
                <div key={s.status} className="flex items-center gap-3">
                  <p className="w-32 text-xs text-gray-300 truncate flex-shrink-0">{STATUS_LABEL[s.status]}</p>
                  <div className="flex-1 h-6 bg-gray-950 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center px-2"
                      style={{ width: `${Math.max(8, (s.count / statusMax) * 100)}%`, backgroundColor: `${STATUS_COLOR[s.status]}66` }}
                    >
                      <span className="text-[10px] font-bold">{s.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-2"><Stethoscope size={15} className="text-blue-400" /> Por profissional</p>
            {byProfessional.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum profissional vinculado a agendamentos ainda.</p>
            ) : (
              <div className="space-y-2">
                {byProfessional.map(p => (
                  <div key={p.name} className="flex items-center gap-3">
                    <p className="w-24 text-xs text-gray-300 truncate flex-shrink-0">{p.name}</p>
                    <div className="flex-1 h-5 bg-gray-950 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg bg-blue-600/50 flex items-center px-2" style={{ width: `${Math.max(8, (p.count / profMax) * 100)}%` }}>
                        <span className="text-[10px] font-bold">{p.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800">
            <p className="font-semibold mb-2 flex items-center gap-2"><Wrench size={15} className="text-purple-400" /> Por serviço</p>
            {byService.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum serviço vinculado a agendamentos ainda.</p>
            ) : (
              <div className="space-y-2">
                {byService.map(s => (
                  <div key={s.name} className="flex items-center gap-3">
                    <p className="w-24 text-xs text-gray-300 truncate flex-shrink-0">{s.name}</p>
                    <div className="flex-1 h-5 bg-gray-950 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg bg-purple-600/50 flex items-center px-2" style={{ width: `${Math.max(8, (s.count / serviceMax) * 100)}%` }}>
                        <span className="text-[10px] font-bold">{s.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <p className="font-semibold">Próximos agendamentos</p>
          <Link href={`/crm/${agentId}/agenda`} className="text-xs text-blue-400 hover:text-blue-300">Ver agenda completa →</Link>
        </div>
        {proximosList.length === 0 ? (
          <p className="text-sm text-gray-500 px-5 pb-5">Nenhum agendamento confirmado nos próximos dias.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {proximosList.map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.contactName || a.contactNumber}{a.service && ` — ${a.service.name}`}</p>
                  <p className="text-xs text-gray-500">
                    {a.scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às {a.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {a.professional && ` · ${a.professional.name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
