const UAZAPI_URL = process.env.UAZAPI_URL ?? "";
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN ?? "";

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  if (!UAZAPI_URL || !UAZAPI_TOKEN) {
    console.warn("[whatsapp] UazAPI não configurado — mensagem não enviada");
    return;
  }

  const number = formatPhone(phone);

  const res = await fetch(`${UAZAPI_URL}/send/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: UAZAPI_TOKEN,
    },
    body: JSON.stringify({ number, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[whatsapp] Erro ao enviar mensagem: ${res.status} ${body}`);
  }
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
