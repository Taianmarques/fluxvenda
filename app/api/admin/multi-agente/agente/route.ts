import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { FLUXVENDA_TEAM_ID } from "@/lib/internal-agent";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const SYSTEM_PROMPT =
  "Você é o atendimento oficial da FluxVenda pelo WhatsApp — a empresa por trás do CRM com IA para WhatsApp e da Plataforma de treinamento de vendas B2B. Fale em português do Brasil, de forma cordial, direta e natural, como um atendente humano de verdade. Nunca invente informações sobre preços, prazos ou funcionalidades que não tiver certeza — nesses casos, ofereça agendar uma demonstração ou transferir pra um humano.";

// Cria (uma única vez, idempotente) o AgentConfig do agente multi-setor da FluxVenda, ligado
// ao número de WhatsApp da própria plataforma (UAZAPI_TOKEN — o mesmo que já manda
// boas-vindas/OTP/funil de trial). Fica "active: false" até o admin ativar pela tela normal
// do CRM (/crm/[id]/canais), igual qualquer agente novo — não começa a responder sozinho.
export async function POST() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const token = process.env.UAZAPI_TOKEN;
  if (!token) return NextResponse.json({ error: "UAZAPI_TOKEN não configurado no servidor" }, { status: 500 });

  const existente = await prisma.agentConfig.findFirst({ where: { teamId: FLUXVENDA_TEAM_ID, uazapiToken: token } });
  if (existente) return NextResponse.json({ agente: { id: existente.id, active: existente.active } });

  const agente = await prisma.agentConfig.create({
    data: {
      teamId: FLUXVENDA_TEAM_ID,
      nome: "Central FluxVenda",
      systemPrompt: SYSTEM_PROMPT,
      uazapiToken: token,
      whatsappProvider: "UAZAPI",
      active: false,
      multiAgenteDepartamentos: true,
    },
  });
  return NextResponse.json({ agente: { id: agente.id, active: agente.active } });
}
