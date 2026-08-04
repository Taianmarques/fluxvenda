import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Goal, KanbanSquare, Handshake, BarChart3, AlertCircle, PhoneCall, Send } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { calcularNiveis, type ClienteParaNivel } from "@/lib/carteira-nivel";
import { GaugeChart, WeeklyBarChart } from "../../dashboards/DashboardCharts";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasDesde(iso: string | Date): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function MeuDesempenhoPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="meudesempenho">
      <MeuDesempenhoPageContent {...props} />
    </CrmPageGate>
  );
}

async function MeuDesempenhoPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <User size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para ver seu desempenho aqui.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [conversations, orders, paidCobrancas] = await Promise.all([
    prisma.conversation.findMany({
      where: { agentConfigId: config.id, assignedToId: user.id },
      select: {
        id: true, contactNumber: true, contactName: true, updatedAt: true, nivelCarteira: true,
        opportunities: { select: { id: true, dealValue: true, wonAt: true, lostAt: true, createdAt: true } },
      },
    }),
    prisma.order.findMany({ where: { agentConfigId: config.id, status: "PAGO" }, select: { contactNumber: true, total: true, deliveryFee: true, paidAt: true } }),
    prisma.cobranca.findMany({ where: { agentConfigId: config.id, status: "PAGO" }, select: { contactNumber: true, valor: true, paidAt: true } }),
  ]);

  // Prospecção do vendedor: conversas que EU abri manualmente (mandei a 1ª mensagem, não o
  // cliente) — diferente da prospecção automatizada por IA, que não tem vendedor associado.
  const meusEnvios = await prisma.message.findMany({
    where: { role: "human", senderId: user.id, conversation: { agentConfigId: config.id } },
    select: { conversationId: true },
    distinct: ["conversationId"],
  });
  const conversationIdsQueEnviei = meusEnvios.map(m => m.conversationId);
  const primeirasMensagens = conversationIdsQueEnviei.length > 0
    ? await prisma.message.findMany({
        where: { conversationId: { in: conversationIdsQueEnviei }, role: { not: "note" } },
        select: { conversationId: true, role: true, senderId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const primeiraPorConversa = new Map<string, { role: string; senderId: string | null; createdAt: Date }>();
  for (const m of primeirasMensagens) {
    if (!primeiraPorConversa.has(m.conversationId)) primeiraPorConversa.set(m.conversationId, m);
  }
  const conversasQueAbri = Array.from(primeiraPorConversa.values()).filter(m => m.role === "human" && m.senderId === user.id);

  const seteDiasAtras = new Date(now.getTime() - 7 * DAY_MS);
  const prospeccao7dias = conversasQueAbri.filter(m => m.createdAt >= seteDiasAtras).length;
  const prospeccaoHoje = conversasQueAbri.filter(m => diasDesde(m.createdAt) === 0).length;

  const prospeccaoDiaria = Array.from({ length: 14 }, (_, i) => {
    const dia = new Date(now.getTime() - (13 - i) * DAY_MS);
    return { dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: 0, ref: dia.toDateString() };
  });
  for (const m of conversasQueAbri) {
    const bucket = prospeccaoDiaria.find(b => b.ref === m.createdAt.toDateString());
    if (bucket) bucket.total += 1;
  }

  // Consolida por contato — meus clientes (mesmo padrão da Carteira, mas só os meus)
  type Cliente = { contactNumber: string; contactName: string | null; lastContactAt: Date; nivelManual: string | null; compras: { at: Date; valor: number }[] };
  const byContact = new Map<string, Cliente>();
  for (const c of conversations) {
    byContact.set(c.contactNumber, {
      contactNumber: c.contactNumber,
      contactName: c.contactName,
      lastContactAt: c.updatedAt,
      nivelManual: c.nivelCarteira,
      compras: c.opportunities.filter(o => o.wonAt).map(o => ({ at: o.wonAt!, valor: o.dealValue })),
    });
  }
  for (const o of orders) {
    const client = byContact.get(o.contactNumber);
    if (!client || !o.paidAt) continue;
    client.compras.push({ at: o.paidAt, valor: o.total + o.deliveryFee });
  }
  for (const cb of paidCobrancas) {
    const client = byContact.get(cb.contactNumber);
    if (!client || !cb.paidAt) continue;
    client.compras.push({ at: cb.paidAt, valor: cb.valor });
  }
  const clientes = Array.from(byContact.values());

  const clientesParaNivel: ClienteParaNivel[] = clientes.map(c => ({
    contactNumber: c.contactNumber, nivelManual: c.nivelManual, compras: c.compras,
  }));
  const niveis = calcularNiveis(clientesParaNivel, config.carteiraInativoDias);

  // KPIs do mês
  const allOpps = conversations.flatMap(c => c.opportunities);
  const openOpps = allOpps.filter(o => !o.wonAt && !o.lostAt);
  const createdThisMonth = allOpps.filter(o => o.createdAt >= startOfMonth);
  const wonThisMonth = allOpps.filter(o => o.wonAt && o.wonAt >= startOfMonth);
  const wonThisMonthTotal = wonThisMonth.reduce((s, o) => s + o.dealValue, 0);
  const openTotal = openOpps.reduce((s, o) => s + o.dealValue, 0);

  const metasPorVendedor = config.metasPorVendedor as Record<string, number>;
  const minhaMeta = metasPorVendedor?.[user.id] ?? 0;
  const metaPct = minhaMeta > 0 ? (wonThisMonthTotal / minhaMeta) * 100 : null;

  // Clientes inativos: os meus clientes cujo nível caiu pra INATIVO, maiores compradores primeiro
  const clientesInativos = clientes
    .filter(c => niveis.get(c.contactNumber) === "INATIVO")
    .map(c => ({ ...c, totalComprado: c.compras.reduce((s, x) => s + x.valor, 0) }))
    .sort((a, b) => b.totalComprado - a.totalComprado)
    .slice(0, 8);

  // Sugestões de contato: clientes A/B (bons compradores) que estão ficando sem contato há mais tempo
  const sugestoesContato = clientes
    .filter(c => { const n = niveis.get(c.contactNumber); return n === "A" || n === "B"; })
    .map(c => ({ ...c, nivel: niveis.get(c.contactNumber)! }))
    .sort((a, b) => a.lastContactAt.getTime() - b.lastContactAt.getTime())
    .slice(0, 8);

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Dashboards</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><User size={28} className="text-blue-400" /> Meu Desempenho</h1>
          <p className="text-gray-400 mt-1">Seus negócios e carteira de clientes — meta e negócios do mês atual.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center min-w-0">
            <p className="font-semibold self-start mb-1 flex items-center gap-2"><Goal size={16} className="text-blue-400" /> Minha meta do mês</p>
            {metaPct === null ? (
              <div className="py-8">
                <p className="text-sm text-gray-600">Nenhuma meta configurada pra você ainda.</p>
                <p className="text-xs text-gray-600 mt-1">Peça ao seu gestor pra configurar em Metas.</p>
              </div>
            ) : (
              <>
                <GaugeChart pct={metaPct} />
                <p className="text-xs text-gray-500 -mt-2 break-words text-center">{formatBRL(wonThisMonthTotal)} de {formatBRL(minhaMeta)}</p>
              </>
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
              <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400 mb-2"><BarChart3 size={18} /></span>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-400 break-words">{createdThisMonth.length}</p>
              <p className="text-xs text-gray-500 mt-1">Oportunidades criadas (mês)</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
              <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400 mb-2"><Handshake size={18} /></span>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-400 break-words">{formatBRL(wonThisMonthTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">Ganhos (mês) · {wonThisMonth.length} {wonThisMonth.length === 1 ? "negócio" : "negócios"}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
              <span className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-2"><KanbanSquare size={18} /></span>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-400 break-words">{formatBRL(openTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">Em aberto · {openOpps.length} {openOpps.length === 1 ? "negócio" : "negócios"}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 min-w-0">
              <span className="inline-flex p-2 rounded-xl bg-red-500/10 text-red-400 mb-2"><AlertCircle size={18} /></span>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-400 break-words">{clientesInativos.length}</p>
              <p className="text-xs text-gray-500 mt-1">Clientes inativos</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-semibold flex items-center gap-2"><Send size={17} className="text-blue-400" /> Minha prospecção</p>
            <p className="text-xs text-gray-500">Conversas que você mesmo iniciou (mandou a 1ª mensagem) — não inclui a prospecção automática por IA.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 rounded-xl p-4">
              <p className="text-xl font-bold text-blue-400">{prospeccaoHoje}</p>
              <p className="text-xs text-gray-500 mt-1">Hoje</p>
            </div>
            <div className="bg-gray-950 rounded-xl p-4">
              <p className="text-xl font-bold text-blue-400">{prospeccao7dias}</p>
              <p className="text-xs text-gray-500 mt-1">Últimos 7 dias</p>
            </div>
          </div>
          {conversasQueAbri.length === 0 ? (
            <p className="text-sm text-gray-600">Você ainda não iniciou nenhuma conversa manualmente.</p>
          ) : (
            <WeeklyBarChart data={prospeccaoDiaria.map(d => ({ semana: d.dia, total: d.total }))} />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <p className="font-semibold p-5 pb-3 flex items-center gap-2"><AlertCircle size={17} className="text-red-400" /> Principais clientes inativos</p>
            {clientesInativos.length === 0 ? (
              <p className="text-sm text-gray-500 px-5 pb-5">Nenhum cliente seu está inativo no momento.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {clientesInativos.map(c => (
                  <div key={c.contactNumber} className="flex items-center justify-between gap-3 px-5 py-3">
                    <p className="text-sm font-medium truncate">{c.contactName || c.contactNumber}</p>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-red-400">{formatBRL(c.totalComprado)}</p>
                      <p className="text-[10px] text-gray-500">{diasDesde(c.lastContactAt)}d sem contato</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <p className="font-semibold p-5 pb-3 flex items-center gap-2"><PhoneCall size={17} className="text-blue-400" /> Sugestões de contato</p>
            <p className="text-xs text-gray-500 px-5 -mt-2 pb-3">Seus clientes A/B (bons compradores) parados há mais tempo.</p>
            {sugestoesContato.length === 0 ? (
              <p className="text-sm text-gray-500 px-5 pb-5">Nenhum cliente de prioridade alta pra sugerir agora.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {sugestoesContato.map(c => (
                  <div key={c.contactNumber} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.contactName || c.contactNumber}</p>
                      <p className="text-[10px] text-gray-500">{diasDesde(c.lastContactAt)}d sem contato</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.nivel === "A" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                      Nível {c.nivel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-400">Quer ver sua carteira completa, com todos os filtros?</p>
          <Link href={`/crm/${agentId}/carteira`} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Ir para Carteira →</Link>
        </div>
      </div>
    </div>
  );
}
