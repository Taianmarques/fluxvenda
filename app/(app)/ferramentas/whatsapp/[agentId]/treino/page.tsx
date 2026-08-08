import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { getAgentConfigAsManager } from "@/lib/team";
import { prisma } from "@/lib/prisma";
import { TreinoClient } from "../../TreinoClient";

export default async function TreinoPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(user.id, agentId);
  if (!config) redirect("/ferramentas");

  const exemplos = await prisma.trainingExample.findMany({
    where: { agentConfigId: agentId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href={`/ferramentas/whatsapp/${agentId}`} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit">
            <ArrowLeft size={12} /> Voltar pro agente
          </Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2"><GraduationCap size={28} className="text-blue-400" /> Treinar com conversas simuladas</h1>
          <p className="text-gray-400 mt-1">
            Cadastre conversas simuladas entre um cliente e um SDR (roleplay entre pessoas do time) mostrando o jeito certo de responder.
            Isso não muda o comportamento do agente agora — só vira dado de treino quando você exportar o lote e usar num fine-tuning na OpenAI.
          </p>
        </div>

        <TreinoClient
          agentId={agentId}
          initialExemplos={exemplos.map(e => ({
            id: e.id,
            cenario: e.cenario,
            turnos: e.turnos as unknown as { role: "user" | "assistant"; content: string }[],
            createdByName: e.createdBy?.name ?? null,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
