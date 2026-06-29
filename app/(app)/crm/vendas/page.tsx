import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, TrendingUp, Handshake, Receipt } from "lucide-react";
import { getOwnAgentConfig } from "@/lib/team";
import { VendasChart } from "./VendasChart";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const config = await getOwnAgentConfig(user.id);

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Wallet size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para acompanhar as vendas aqui.</p>
          <Link href="/ferramentas/whatsapp" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Configurar agente
          </Link>
        </div>
      </div>
    );
  }

  const wonDeals = await prisma.opportunity.findMany({
    where: { wonAt: { not: null }, conversation: { agentConfigId: config.id } },
    orderBy: { wonAt: "desc" },
    include: { conversation: { select: { contactName: true, contactNumber: true } } },
  });

  const total = wonDeals.reduce((sum, d) => sum + d.dealValue, 0);
  const count = wonDeals.length;
  const ticketMedio = count > 0 ? total / count : 0;

  // Receita ganha nos últimos 6 meses, mais antigo primeiro
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), mes: d.toLocaleDateString("pt-BR", { month: "short" }), total: 0 };
  });
  for (const deal of wonDeals) {
    if (!deal.wonAt) continue;
    const bucket = monthly.find(m => m.year === deal.wonAt!.getFullYear() && m.month === deal.wonAt!.getMonth());
    if (bucket) bucket.total += deal.dealValue;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Wallet size={28} className="text-blue-400" /> Vendas</h1>
          <p className="text-gray-400 mt-1">Negociações marcadas como ganhas a partir do CRM de WhatsApp.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-400 mb-2"><TrendingUp size={18} /></span>
            <p className="text-3xl font-bold text-green-400">{formatBRL(total)}</p>
            <p className="text-xs text-gray-500 mt-1">Total ganho</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-blue-500/10 text-blue-400 mb-2"><Handshake size={18} /></span>
            <p className="text-3xl font-bold text-blue-400">{count}</p>
            <p className="text-xs text-gray-500 mt-1">Negócios ganhos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <span className="inline-flex p-2 rounded-xl bg-purple-500/10 text-purple-400 mb-2"><Receipt size={18} /></span>
            <p className="text-3xl font-bold text-purple-400">{formatBRL(ticketMedio)}</p>
            <p className="text-xs text-gray-500 mt-1">Ticket médio</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="font-semibold mb-3">Receita ganha por mês</p>
          <VendasChart data={monthly.map(m => ({ mes: m.mes, total: m.total }))} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">Negócios ganhos</p>
          {wonDeals.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhuma negociação marcada como ganha ainda. Marque uma oportunidade como ganha numa conversa no CRM para ver os dados aqui.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {wonDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{d.conversation.contactName || d.conversation.contactNumber}{d.title && ` — ${d.title}`}</p>
                    <p className="text-xs text-gray-500">{d.wonAt!.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-400">{formatBRL(d.dealValue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
