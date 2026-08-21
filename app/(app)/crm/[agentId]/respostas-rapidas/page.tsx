import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { RespostasRapidasClient } from "../../respostas-rapidas/RespostasRapidasClient";

export default function RespostasRapidasPage(props: { params: Promise<{ agentId: string }> }) {
  return (
    <CrmPageGate pageKey="respostasrapidas">
      <RespostasRapidasPageContent {...props} />
    </CrmPageGate>
  );
}

async function RespostasRapidasPageContent({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <MessageSquareText size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Agente não encontrado</h1>
          <Link href="/crm" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Voltar ao CRM
          </Link>
        </div>
      </div>
    );
  }

  const quickReplies = await prisma.quickReply.findMany({
    where: { agentConfigId: config.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <RespostasRapidasClient
      agentId={config.id}
      initialQuickReplies={quickReplies.map(qr => ({ id: qr.id, title: qr.title, content: qr.content }))}
    />
  );
}
