import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { makeOutboundCall } from "@/lib/twilio-voice";
import { textToSpeech } from "@/lib/elevenlabs";

// GET — lista chamadas do agente
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const access = await getAgentConfigWithRole(user.id, agentId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const calls = await prisma.phoneCall.findMany({
    where: { agentConfigId: agentId },
    include: {
      turns: { select: { id: true, role: true, content: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(calls);
}

// POST — inicia chamada outbound
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const access = await getAgentConfigWithRole(user.id, agentId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { contactNumber, contactName, conversationId } = body as {
    contactNumber: string;
    contactName?: string;
    conversationId?: string;
  };

  if (!contactNumber) {
    return NextResponse.json({ error: "contactNumber é obrigatório" }, { status: 400 });
  }

  const agent = await prisma.agentConfig.findUnique({
    where: { id: agentId },
    select: {
      nome: true,
      phoneEnabled: true,
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioPhoneNumber: true,
      elevenlabsApiKey: true,
      elevenlabsVoiceId: true,
    },
  });

  if (!agent?.phoneEnabled) {
    return NextResponse.json({ error: "Agente de ligação não está habilitado" }, { status: 400 });
  }
  if (!agent.twilioAccountSid || !agent.twilioAuthToken || !agent.twilioPhoneNumber) {
    return NextResponse.json({ error: "Credenciais Twilio não configuradas" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Cria o PhoneCall e pré-gera o áudio de saudação ANTES de iniciar a chamada
  // para que o webhook /voice responda em <1s (sem aguardar ElevenLabs)
  const call = await prisma.phoneCall.create({
    data: {
      agentConfigId: agentId,
      direction: "OUTBOUND",
      contactNumber,
      contactName: contactName ?? "",
      conversationId: conversationId ?? null,
      status: "EM_ANDAMENTO",
    },
  });

  const saudacao = `Olá! Aqui é ${agent.nome}. Como posso te ajudar hoje?`;
  if (agent.elevenlabsApiKey) {
    try {
      const audioBuffer = await textToSpeech(saudacao, {
        apiKey: agent.elevenlabsApiKey,
        voiceId: agent.elevenlabsVoiceId ?? undefined,
      });
      await prisma.phoneCallTurn.create({
        data: {
          callId: call.id,
          role: "assistant",
          content: saudacao,
          audioData: audioBuffer.toString("base64"),
        },
      });
    } catch (e) {
      console.error("ElevenLabs pré-geração falhou, fallback para <Say>:", e);
    }
  }

  try {
    const callSid = await makeOutboundCall({
      accountSid: agent.twilioAccountSid,
      authToken: agent.twilioAuthToken,
      from: agent.twilioPhoneNumber,
      to: contactNumber,
      voiceUrl: `${appUrl}/api/webhooks/twilio/${agentId}/voice?callId=${call.id}`,
      statusCallbackUrl: `${appUrl}/api/webhooks/twilio/${agentId}/status`,
    });

    const updated = await prisma.phoneCall.update({
      where: { id: call.id },
      data: { twilioCallSid: callSid },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    await prisma.phoneCall.update({
      where: { id: call.id },
      data: { status: "FALHADA" },
    });
    console.error("Erro ao iniciar chamada Twilio:", e);
    return NextResponse.json({ error: e.message ?? "Falha ao iniciar chamada" }, { status: 500 });
  }
}
