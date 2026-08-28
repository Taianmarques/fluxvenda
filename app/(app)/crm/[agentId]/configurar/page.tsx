import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Smartphone } from "lucide-react";
import { getAgentConfigAsManager } from "@/lib/team";
import { WhatsappAgentClient } from "./WhatsappAgentClient";
import { WhatsappCloudConnect } from "./WhatsappCloudConnect";
import { AgentSettingsShell } from "./AgentSettingsShell";
import { getInstanceStatus } from "@/lib/whatsapp";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default async function WhatsappAgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(user.id, agentId);
  if (!config) redirect("/crm");

  if (!config.systemPrompt) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <Link href="/crm/hub" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit"><ArrowLeft size={12} /> Agentes de IA</Link>
            <h1 className="text-3xl font-bold mt-2 flex items-center gap-2"><Bot size={28} className="text-blue-400" /> Agente de Atendimento</h1>
            <p className="text-gray-400 mt-1">Configure seu agente de IA antes de conectar os canais (WhatsApp ou Instagram) — a conexão é o último passo.</p>
          </div>
          <WhatsappAgentClient
            agentId={config.id}
            segmento={{ segmento: config.segmento, subsegmento: config.subsegmento }}
            initialConfig={{
              nome: config.nome, tom: config.tom, servicos: config.servicos, objecoes: config.objecoes,
              horario: config.horario, uazapiInstance: config.uazapiInstance, isConfigured: Boolean(config.systemPrompt),
              descricaoEmpresa: config.descricaoEmpresa, precos: config.precos, enderecoContato: config.enderecoContato,
              followupEnabled: config.followupEnabled, followupDelaysMinutes: config.followupDelaysMinutes as unknown as number[], emojiEnabled: config.emojiEnabled,
            }}
          />
        </div>
      </div>
    );
  }

  const [instanceStatus, igConnection] = await Promise.all([
    config.uazapiToken
      ? getInstanceStatus(config.uazapiToken).catch(() => ({ connected: false }))
      : Promise.resolve({ connected: false }),
    prisma.instagramConnection.findUnique({ where: { agentConfigId: config.id } }),
  ]);

  const cloudApiConnected = config.whatsappProvider === "CLOUD_API" && Boolean(config.cloudApiPhoneNumberId && config.cloudApiAccessToken);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const cloudConfigProps = {
    whatsappProvider: config.whatsappProvider,
    cloudApiPhoneNumberId: config.cloudApiPhoneNumberId ?? "",
    cloudApiWabaId: config.cloudApiWabaId ?? "",
    cloudApiAccessToken: config.cloudApiAccessToken ?? "",
    cloudApiVerifyToken: config.cloudApiVerifyToken ?? "",
    cloudApiPhoneNumber: config.cloudApiPhoneNumber ?? "",
    cloudApiVerifiedName: config.cloudApiVerifiedName ?? "",
  };

  // Só bloqueia na tela de conexão se NENHUM canal estiver conectado
  if (!instanceStatus.connected && !igConnection && !cloudApiConnected) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <Link href="/crm/hub" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-fit"><ArrowLeft size={12} /> Agentes de IA</Link>
            <h1 className="text-2xl font-bold mt-2 flex items-center gap-2"><Smartphone size={24} className="text-blue-400" /> Conecte um canal</h1>
            <p className="text-gray-400 mt-1">{config.nome} já está configurado. Escaneie o QR code com o WhatsApp do número <span className="text-gray-300">{config.uazapiInstance}</span>, conecte pela API oficial da Meta, ou conecte o Instagram se preferir.</p>
          </div>
          <div className="max-w-md space-y-4">
            <WhatsappCloudConnect agentId={config.id} appUrl={appUrl} initialConfig={cloudConfigProps} />
            <Link
              href="/crm/canais"
              className="block text-center text-sm text-purple-400 hover:text-purple-300 border border-purple-800/50 hover:border-purple-600/50 rounded-xl px-4 py-2.5 transition-colors"
            >
              Prefiro conectar o Instagram — ir para Canais
            </Link>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Configurações do agente</h2>
            <WhatsappAgentClient
              agentId={config.id}
              segmento={{ segmento: config.segmento, subsegmento: config.subsegmento }}
              initialConfig={{
                nome: config.nome, tom: config.tom, servicos: config.servicos, objecoes: config.objecoes,
                horario: config.horario, uazapiInstance: config.uazapiInstance, isConfigured: Boolean(config.systemPrompt),
                descricaoEmpresa: config.descricaoEmpresa, precos: config.precos, enderecoContato: config.enderecoContato,
                followupEnabled: config.followupEnabled, followupDelaysMinutes: config.followupDelaysMinutes as unknown as number[], emojiEnabled: config.emojiEnabled,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const [totalConversas, conversasHoje, conversasSemana] = await Promise.all([
    prisma.conversation.count({ where: { agentConfigId: config.id } }),
    prisma.conversation.count({ where: { agentConfigId: config.id, createdAt: { gte: daysAgo(1) } } }),
    prisma.conversation.count({ where: { agentConfigId: config.id, createdAt: { gte: daysAgo(7) } } }),
  ]);

  const connectedLabel = [
    (instanceStatus.connected || cloudApiConnected) && "ao WhatsApp",
    igConnection && "ao Instagram",
  ].filter(Boolean).join(" e ");

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <AgentSettingsShell
          agentId={config.id}
          nome={config.nome}
          active={config.active}
          connectedLabel={connectedLabel}
          conversasHoje={conversasHoje}
          conversasSemana={conversasSemana}
          totalConversas={totalConversas}
          distribuicaoConfig={{
            leadDistributionMode: config.leadDistributionMode,
            iaIgnoraAtribuidos: config.iaIgnoraAtribuidos,
            transferirAoPedirFoto: config.transferirAoPedirFoto,
            iaLeadAttendantId: config.iaLeadAttendantId,
            iaNiveisCarteiraExcluidos: config.iaNiveisCarteiraExcluidos as unknown as string[],
            transferenciaCondicoes: config.transferenciaCondicoes,
          }}
          phoneConfig={{
            phoneEnabled: config.phoneEnabled,
            whatsappVoiceEnabled: config.whatsappVoiceEnabled,
            whatsappVoicePercent: config.whatsappVoicePercent,
            twilioAccountSid: config.twilioAccountSid ?? "",
            twilioAuthToken: config.twilioAuthToken ?? "",
            twilioPhoneNumber: config.twilioPhoneNumber ?? "",
            elevenlabsApiKey: config.elevenlabsApiKey ?? "",
            elevenlabsVoiceId: config.elevenlabsVoiceId ?? "",
            phoneCallPrompt: config.phoneCallPrompt,
          }}
          segmento={{ segmento: config.segmento, subsegmento: config.subsegmento }}
          whatsappAgentConfig={{
            nome: config.nome, tom: config.tom, servicos: config.servicos, objecoes: config.objecoes, horario: config.horario,
            descricaoEmpresa: config.descricaoEmpresa, precos: config.precos, enderecoContato: config.enderecoContato,
            followupEnabled: config.followupEnabled, followupDelaysMinutes: config.followupDelaysMinutes as unknown as number[], emojiEnabled: config.emojiEnabled,
            responseDelaySeconds: config.responseDelaySeconds, agentSignatureEnabled: config.agentSignatureEnabled,
            instrucoesExtras: config.instrucoesExtras,
          }}
          whatsappAiPaused={config.whatsappAiPaused}
          instagramAiPaused={config.instagramAiPaused}
        />
      </div>
    </div>
  );
}
