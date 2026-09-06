import { prisma } from "@/lib/prisma";

// WhatsApp (UazAPI ou Cloud API) conectado — não confundir com AgentConfig.active, que só
// controla se a IA responde sozinha (mensagens são salvas mesmo com active=false). Usado
// pelas páginas do CRM que devem funcionar assim que o canal existe, antes de "Ativar IA".
export function hasWhatsappConnected(config: { uazapiToken: string | null; cloudApiPhoneNumberId: string | null; cloudApiAccessToken: string | null }): boolean {
  return Boolean(config.uazapiToken) || Boolean(config.cloudApiPhoneNumberId && config.cloudApiAccessToken);
}

// WhatsApp OU Instagram conectado.
export async function isChannelConnected(config: { id: string; uazapiToken: string | null; cloudApiPhoneNumberId: string | null; cloudApiAccessToken: string | null }): Promise<boolean> {
  if (hasWhatsappConnected(config)) return true;
  const ig = await prisma.instagramConnection.findFirst({ where: { agentConfigId: config.id }, select: { id: true } });
  return Boolean(ig);
}
