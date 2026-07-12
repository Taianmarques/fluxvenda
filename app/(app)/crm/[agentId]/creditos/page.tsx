import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCreditsStatus } from "@/lib/token-usage";
import { Coins, Lock } from "lucide-react";
import { CreditosClient } from "../../../creditos/CreditosClient";

// Mesmo conteúdo de app/(app)/creditos/page.tsx, só que dentro do layout do CRM
// (crm/[agentId]/layout.tsx) — assim o menu do CRM continua visível ao acessar por lá,
// em vez de trocar pro menu principal da Plataforma B2B. Créditos são por equipe, não por
// agente — o agentId na URL só mantém o contexto do sidebar/agent-switcher.
export default async function CrmCreditosPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } });
  const isGestor = profile?.role === "GESTOR" || profile?.role === "ADMIN";

  if (!isGestor) {
    return (
      <div className="min-h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Lock size={48} className="mx-auto text-gray-600" />
          <h1 className="text-2xl font-bold">Restrito ao gestor</h1>
          <p className="text-gray-400">A compra de créditos de IA é feita pelo dono da equipe.</p>
        </div>
      </div>
    );
  }

  const team = await prisma.team.findUnique({ where: { managerId: user.id } });
  if (!team) {
    return (
      <div className="min-h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Coins size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhuma equipe encontrada</h1>
        </div>
      </div>
    );
  }

  const [status, compras] = await Promise.all([
    getCreditsStatus(team.id),
    prisma.creditoCompra.findMany({
      where: { teamId: team.id, status: "PAGO" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <CreditosClient
      status={status}
      compras={compras.map((c) => ({
        id: c.id,
        packId: c.packId,
        tokens: c.tokens,
        valorCentavos: c.valorCentavos,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
