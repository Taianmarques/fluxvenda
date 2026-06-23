const UAZAPI_URL = process.env.UAZAPI_URL ?? "";
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN ?? "";
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN ?? "";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function sendText(url: string, token: string, phone: string, text: string): Promise<void> {
  const number = formatPhone(phone);

  const res = await fetch(`${url}/send/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({ number, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[whatsapp] Erro ao enviar mensagem: ${res.status} ${body}`);
  }
}

// Envia pela instância global da plataforma (notificações de onboarding, etc.)
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  if (!UAZAPI_URL || !UAZAPI_TOKEN) {
    console.warn("[whatsapp] UazAPI não configurado — mensagem não enviada");
    return;
  }
  await sendText(UAZAPI_URL, UAZAPI_TOKEN, phone, text);
}

// Envia pela instância própria de uma empresa (agente de atendimento por equipe)
export async function sendWhatsAppTextAsTeam(token: string, phone: string, text: string): Promise<void> {
  if (!UAZAPI_URL || !token) {
    console.warn("[whatsapp] Instância da equipe não configurada — mensagem não enviada");
    return;
  }
  await sendText(UAZAPI_URL, token, phone, text);
}

export type UazapiInstanceStatus = {
  connected: boolean;
  qrcode: string | null;
  paircode: string | null;
  profileName: string | null;
  ownerNumber: string | null;
};

function parseInstanceStatus(data: any): UazapiInstanceStatus {
  const instance = data?.instance ?? {};
  return {
    connected: Boolean(data?.status?.connected ?? instance.status === "connected"),
    qrcode: instance.qrcode || null,
    paircode: instance.paircode || null,
    profileName: instance.profileName || null,
    ownerNumber: instance.owner || null,
  };
}

// Dispara a geração de QR code / pairing code de uma instância (ou confirma que já está conectada)
export async function connectInstance(token: string): Promise<UazapiInstanceStatus> {
  const res = await fetch(`${UAZAPI_URL}/instance/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Erro ao conectar instância: ${res.status}`);
  return parseInstanceStatus(await res.json());
}

// Consulta o status atual da conexão (usado para polling após exibir o QR code)
export async function getInstanceStatus(token: string): Promise<UazapiInstanceStatus> {
  const res = await fetch(`${UAZAPI_URL}/instance/status`, {
    method: "GET",
    headers: { token },
  });
  if (!res.ok) throw new Error(`Erro ao consultar status da instância: ${res.status}`);
  return parseInstanceStatus(await res.json());
}

// Desconecta (logout) o WhatsApp da instância, sem excluir a instância — pode reconectar depois via QR code
export async function disconnectInstance(token: string): Promise<void> {
  const res = await fetch(`${UAZAPI_URL}/instance/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Erro ao desconectar instância: ${res.status}`);
}

// Cria uma instância nova na UazAPI para uma empresa (multi-tenant) e retorna seu token dedicado
export async function createInstance(name: string): Promise<{ token: string; name: string }> {
  if (!UAZAPI_ADMIN_TOKEN) throw new Error("UAZAPI_ADMIN_TOKEN não configurado");

  const res = await fetch(`${UAZAPI_URL}/instance/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", admintoken: UAZAPI_ADMIN_TOKEN },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Erro ao criar instância: ${res.status}`);
  const data = await res.json();
  return { token: data.token ?? data.instance?.token, name: data.name ?? data.instance?.name ?? name };
}

// Aponta o webhook da instância da empresa para o nosso endpoint do agente
export async function registerAgentWebhook(token: string, webhookUrl: string): Promise<void> {
  const res = await fetch(`${UAZAPI_URL}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      events: ["messages"],
      excludeMessages: ["wasSentByApi", "isGroupYes"],
      addUrlEvents: false,
      addUrlTypesMessages: false,
    }),
  });
  if (!res.ok) throw new Error(`Erro ao registrar webhook: ${res.status}`);
}

export function buildWelcomeMessage(name: string, role: "GESTOR" | "VENDEDOR" | "FUNCIONARIO", companyName?: string): string {
  if (role === "GESTOR") {
    return [
      `Olá, ${name}! 👋`,
      ``,
      `Seu cadastro na plataforma foi realizado com sucesso.`,
      companyName ? `A empresa *${companyName}* já está configurada.` : "",
      ``,
      `Acesse o painel do gestor e comece a estruturar o treinamento da sua equipe de vendas. 🚀`,
    ].filter(l => l !== undefined).join("\n");
  }

  if (role === "FUNCIONARIO") {
    return [
      `Olá, ${name}! 👋`,
      ``,
      `Bem-vindo(a) à plataforma!`,
      ``,
      `Seu acesso como funcionário foi criado. Acesse seu dashboard e comece os treinamentos personalizados para a sua equipe. 🎯`,
    ].join("\n");
  }

  return [
    `Olá, ${name}! 👋`,
    ``,
    `Bem-vindo(a) à plataforma!`,
    ``,
    `Seu perfil de vendedor foi criado. Acesse seu dashboard e comece os treinamentos personalizados para o seu segmento. 🎯`,
  ].join("\n");
}
