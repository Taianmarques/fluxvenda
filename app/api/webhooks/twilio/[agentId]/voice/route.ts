// Webhook inicial: Twilio chama quando a chamada é atendida.
// O áudio de saudação já foi pré-gerado em /api/agentes/[agentId]/ligacoes
// para que esse webhook responda em <200ms.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGreetingTwiml } from "@/lib/twilio-voice";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const url = new URL(req.url);
  const preCallId = url.searchParams.get("callId"); // ID pré-criado pela API

  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const from = formData.get("From") as string;
  const direction = formData.get("Direction") as string;

  const agent = await prisma.agentConfig.findUnique({
    where: { id: agentId },
    select: {
      nome: true,
      descricaoEmpresa: true,
      phoneCallPrompt: true,
      elevenlabsApiKey: true,
      elevenlabsVoiceId: true,
    },
  });

  if (!agent) {
    return xmlResponse(`<?xml version="1.0"?><Response><Say language="pt-BR">Agente não encontrado.</Say><Hangup/></Response>`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Usa ou cria o PhoneCall
  let call;
  if (preCallId) {
    call = await prisma.phoneCall.update({
      where: { id: preCallId },
      data: { twilioCallSid: callSid },
    });
  } else {
    call = await prisma.phoneCall.upsert({
      where: { twilioCallSid: callSid },
      update: {},
      create: {
        agentConfigId: agentId,
        twilioCallSid: callSid,
        direction: direction?.startsWith("outbound") ? "OUTBOUND" : "INBOUND",
        contactNumber: from,
        status: "EM_ANDAMENTO",
      },
    });
  }

  const gatherUrl = `${appUrl}/api/webhooks/twilio/${agentId}/gather?callId=${call.id}`;
  const saudacao = `Olá! Aqui é ${agent.nome}. Como posso te ajudar hoje?`;

  // Outbound: busca turn pré-gerado (resposta < 200ms)
  if (preCallId) {
    const existingTurn = await prisma.phoneCallTurn.findFirst({
      where: { callId: call.id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });
    if (existingTurn?.audioData) {
      const audioUrl = `${appUrl}/api/webhooks/twilio/${agentId}/audio/${existingTurn.id}`;
      return xmlResponse(buildGreetingTwiml({ audioUrl, gatherUrl, callId: call.id }));
    }
  }

  // Inbound ou fallback: <Say> nativo do Twilio — resposta instantânea, sem silêncio
  await prisma.phoneCallTurn.create({
    data: { callId: call.id, role: "assistant", content: saudacao },
  });
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR">${saudacao}</Say>
  <Gather input="speech" action="${gatherUrl}" method="POST"
          language="pt-BR" speechTimeout="auto" timeout="30">
  </Gather>
  <Say language="pt-BR">Não ouvi nada. Encerrando a ligação.</Say>
</Response>`);
}

function xmlResponse(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}
