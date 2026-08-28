import { BarChart3, CheckCircle2, MessageCircle, Timer, Bot, UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { AgentConfig } from "@/app/generated/prisma/client";
import { WeeklyBarChart, MinutesLineChart, HourHeatmap, AttendantDonutChart } from "./DashboardCharts";
import { DAY_MS } from "./dashboard-utils";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Estilo inspirado na aba "Multiatendimento" de um CRM concorrente (cards de volume +
// heatmap por hora + tempo de resposta), com um adicional que ele não tem: comparação
// IA x humano, já que atendimento por IA é o diferencial da FluxVenda.
export async function MultiatendimentoTab({ agentId, config, from, to }: {
  agentId: string;
  config: AgentConfig;
  from: Date;
  to: Date;
}) {
  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1);
  const prevTo = new Date(from.getTime() - DAY_MS);
  const prevFrom = new Date(prevTo.getTime() - (periodDays - 1) * DAY_MS);

  const [convsPeriodo, convsAnterior, convsAbertas] = await Promise.all([
    prisma.conversation.findMany({
      where: { agentConfigId: config.id, isSandbox: false, isGroup: false, createdAt: { gte: from, lte: to } },
      select: { id: true, createdAt: true, encerradaEm: true, humanTakeover: true },
    }),
    prisma.conversation.count({
      where: { agentConfigId: config.id, isSandbox: false, isGroup: false, createdAt: { gte: prevFrom, lte: prevTo } },
    }),
    prisma.conversation.findMany({
      where: { agentConfigId: config.id, isSandbox: false, isGroup: false, status: { not: "FINALIZADO" } },
      select: { id: true },
    }),
  ]);

  const finalizadasPeriodo = convsPeriodo.filter(c => c.encerradaEm && c.encerradaEm >= from && c.encerradaEm <= to).length;
  const finalizadasAnterior = await prisma.conversation.count({
    where: { agentConfigId: config.id, isSandbox: false, isGroup: false, encerradaEm: { gte: prevFrom, lte: prevTo } },
  });

  // Mensagens das conversas do período (pra tempo de resposta) + das abertas agora (pra
  // separar "iniciado" de "aguardando"). Só id/role/createdAt — sem conteúdo, mais leve.
  const convIdsRelevantes = [...new Set([...convsPeriodo.map(c => c.id), ...convsAbertas.map(c => c.id)])];
  const mensagens = convIdsRelevantes.length > 0
    ? await prisma.message.findMany({
        where: { conversationId: { in: convIdsRelevantes }, role: { in: ["user", "assistant", "human"] } },
        select: { conversationId: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const msgsByConv = new Map<string, typeof mensagens>();
  for (const m of mensagens) {
    const list = msgsByConv.get(m.conversationId) ?? [];
    list.push(m);
    msgsByConv.set(m.conversationId, list);
  }

  // Abertas: "iniciado" já teve alguma resposta (IA ou humano); "aguardando" só tem
  // mensagem do cliente ainda, ninguém respondeu.
  let abertasIniciadas = 0, abertasAguardando = 0;
  for (const c of convsAbertas) {
    const msgs = msgsByConv.get(c.id) ?? [];
    if (msgs.some(m => m.role === "assistant" || m.role === "human")) abertasIniciadas++;
    else abertasAguardando++;
  }

  // Volume diário (criadas no período) + heatmap dia-da-semana x hora
  const bucketDays = periodDays > 35 ? 7 : 1;
  const bucketCount = Math.ceil(periodDays / bucketDays);
  const dayBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const bucketStart = new Date(from.getTime() + i * bucketDays * DAY_MS);
    const bucketEnd = new Date(Math.min(bucketStart.getTime() + bucketDays * DAY_MS, to.getTime() + DAY_MS));
    return { start: bucketStart, end: bucketEnd, semana: bucketStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: 0 };
  });
  const tickInterval = bucketCount > 20 ? Math.ceil(bucketCount / 15) - 1 : 0;
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const c of convsPeriodo) {
    const bucket = dayBuckets.find(b => c.createdAt >= b.start && c.createdAt < b.end);
    if (bucket) bucket.total += 1;
    heatmap[c.createdAt.getDay()][c.createdAt.getHours()] += 1;
  }

  // Tempo de resposta: pra cada mensagem do cliente, quanto tempo até a próxima resposta
  // (IA ou humano) — bucketado por dia, e também separado por quem respondeu (IA x humano)
  // pra comparação. Tempo pra iniciar atendimento: só a primeira resposta de cada conversa.
  const respostaPorDia = new Map<string, { somaMin: number; count: number }>();
  const inicioPorDia = new Map<string, { somaMin: number; count: number }>();
  let somaRespostaIA = 0, countRespostaIA = 0, somaRespostaHumana = 0, countRespostaHumana = 0;

  for (const c of convsPeriodo) {
    const msgs = msgsByConv.get(c.id) ?? [];
    let primeiraResposta = true;
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role !== "user") continue;
      const proxima = msgs.slice(i + 1).find(m => m.role === "assistant" || m.role === "human");
      if (!proxima) continue;
      const minutos = (proxima.createdAt.getTime() - msgs[i].createdAt.getTime()) / 60000;
      if (minutos < 0 || minutos > 24 * 60) continue; // ignora gaps absurdos (ex: cliente sumiu e voltou dias depois)

      const diaKey = msgs[i].createdAt.toISOString().slice(0, 10);
      const acc = respostaPorDia.get(diaKey) ?? { somaMin: 0, count: 0 };
      acc.somaMin += minutos; acc.count += 1;
      respostaPorDia.set(diaKey, acc);

      if (proxima.role === "assistant") { somaRespostaIA += minutos; countRespostaIA++; }
      else { somaRespostaHumana += minutos; countRespostaHumana++; }

      if (primeiraResposta) {
        const accInicio = inicioPorDia.get(diaKey) ?? { somaMin: 0, count: 0 };
        accInicio.somaMin += minutos; accInicio.count += 1;
        inicioPorDia.set(diaKey, accInicio);
        primeiraResposta = false;
      }
    }
  }

  const tempoRespostaSerie = dayBuckets.map(b => {
    const key = b.start.toISOString().slice(0, 10);
    const acc = respostaPorDia.get(key);
    return { dia: b.semana, minutos: acc ? Math.round((acc.somaMin / acc.count) * 10) / 10 : 0 };
  });
  const tempoInicioSerie = dayBuckets.map(b => {
    const key = b.start.toISOString().slice(0, 10);
    const acc = inicioPorDia.get(key);
    return { dia: b.semana, minutos: acc ? Math.round((acc.somaMin / acc.count) * 10) / 10 : 0 };
  });
  const temRespostaData = tempoRespostaSerie.some(d => d.minutos > 0);
  const temInicioData = tempoInicioSerie.some(d => d.minutos > 0);

  const mediaRespostaIA = countRespostaIA > 0 ? somaRespostaIA / countRespostaIA : null;
  const mediaRespostaHumana = countRespostaHumana > 0 ? somaRespostaHumana / countRespostaHumana : null;

  const soIA = convsPeriodo.filter(c => !c.humanTakeover).length;
  const comHumano = convsPeriodo.length - soIA;

  const kpis = [
    { label: "Total de atendimentos", value: convsPeriodo.length, pct: pctChange(convsPeriodo.length, convsAnterior), icon: BarChart3, color: "blue" },
    { label: "Atendimentos finalizados", value: finalizadasPeriodo, pct: pctChange(finalizadasPeriodo, finalizadasAnterior), icon: CheckCircle2, color: "green" },
    { label: "Em aberto · Iniciados", value: abertasIniciadas, pct: null, icon: MessageCircle, color: "purple" },
    { label: "Em aberto · Aguardando", value: abertasAguardando, pct: null, icon: Timer, color: "amber" },
  ];
  const COLOR_CLASSES: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400", green: "bg-green-500/10 text-green-400",
    purple: "bg-purple-500/10 text-purple-400", amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex p-2 rounded-xl ${COLOR_CLASSES[k.color]}`}><k.icon size={18} /></span>
              {k.pct !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${k.pct >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {k.pct >= 0 ? "+" : ""}{k.pct.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1">Atendimentos</p>
          <p className="text-xs text-gray-500 mb-3">Atendimentos iniciados no período.</p>
          <WeeklyBarChart data={dayBuckets.map(b => ({ semana: b.semana, total: b.total }))} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1">Atendimentos iniciados por hora</p>
          <p className="text-xs text-gray-500 mb-3">Soma de atendimentos por dia da semana e hora no período.</p>
          <HourHeatmap data={heatmap} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1">Tempo de resposta</p>
          <p className="text-xs text-gray-500 mb-3">Tempo médio das respostas (IA + humano) dentro do período.</p>
          {temRespostaData ? <MinutesLineChart data={tempoRespostaSerie} dataKey="minutos" color="#3b82f6" tickInterval={tickInterval} /> : <p className="text-sm text-gray-600 py-10 text-center">Sem dados suficientes no período.</p>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1">Tempo para iniciar atendimento</p>
          <p className="text-xs text-gray-500 mb-3">Tempo médio até a primeira resposta no período.</p>
          {temInicioData ? <MinutesLineChart data={tempoInicioSerie} dataKey="minutos" color="#f59e0b" tickInterval={tickInterval} /> : <p className="text-sm text-gray-600 py-10 text-center">Sem dados suficientes no período.</p>}
        </div>
      </div>

      {/* IA x Humano — diferencial da FluxVenda, não existe num CRM sem agente de IA */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-1 flex items-center gap-2"><Bot size={16} className="text-blue-400" /> IA x Humano</p>
          <p className="text-xs text-gray-500 mb-2">Atendimentos do período que precisaram (ou não) de um humano assumir.</p>
          {convsPeriodo.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">Nenhum atendimento no período.</p>
          ) : (
            <AttendantDonutChart data={[{ name: "Só IA", value: soIA }, { name: "Com humano", value: comHumano }]} />
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-3">Velocidade de resposta: IA x Humano</p>
          <div className="grid grid-cols-2 gap-4 h-full items-center">
            <div className="bg-gray-950 rounded-xl p-4 flex flex-col items-center text-center">
              <Bot size={20} className="text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-blue-400">{mediaRespostaIA === null ? "—" : `${mediaRespostaIA.toFixed(1)}m`}</p>
              <p className="text-xs text-gray-500 mt-1">Média da IA · {countRespostaIA} {countRespostaIA === 1 ? "resposta" : "respostas"}</p>
            </div>
            <div className="bg-gray-950 rounded-xl p-4 flex flex-col items-center text-center">
              <UserCheck size={20} className="text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-400">{mediaRespostaHumana === null ? "—" : `${mediaRespostaHumana.toFixed(1)}m`}</p>
              <p className="text-xs text-gray-500 mt-1">Média humana · {countRespostaHumana} {countRespostaHumana === 1 ? "resposta" : "respostas"}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
