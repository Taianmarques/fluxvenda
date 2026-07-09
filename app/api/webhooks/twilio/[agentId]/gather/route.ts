// Webhook de gather: recebe o transcript da fala do usuário, envia ao Claude,
// gera resposta em voz com ElevenLabs e retorna TwiML para continuar a chamada.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { textToSpeech } from "@/lib/elevenlabs";
import { buildReplyTwiml, buildEndTwiml } from "@/lib/twilio-voice";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Apenas despedidas explícitas encerram a chamada — "obrigado" sozinho não conta
const GOODBYE_PATTERNS = /\b(tchau|até logo|pode encerrar|pode desligar|encerra a chamada|encerrar a ligação|bye)\b/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");

  const formData = await req.formData();
  const speechResult = (formData.get("SpeechResult") as string) ?? "";
  const confidence = parseFloat((formData.get("Confidence") as string) ?? "0");

  console.log(`[GATHER] callId=${callId} speech="${speechResult}" confidence=${confidence}`);

  if (!callId) return twilioError("callId ausente");

  const [call, agent] = await Promise.all([
    prisma.phoneCall.findUnique({
      where: { id: callId },
      include: { turns: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.agentConfig.findUnique({
      where: { id: agentId },
      select: {
        nome: true,
        systemPrompt: true,
        descricaoEmpresa: true,
        phoneCallPrompt: true,
        elevenlabsApiKey: true,
        elevenlabsVoiceId: true,
      },
    }),
  ]);

  if (!call || !agent) return twilioError("chamada ou agente não encontrado");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const gatherUrl = `${appUrl}/api/webhooks/twilio/${agentId}/gather?callId=${callId}`;

  // Sem transcrição — pede que o usuário repita
  if (!speechResult || confidence < 0.3) {
    const retry = "Desculpe, não entendi bem. Pode repetir?";
    return await speakAndGather(retry, agent, agentId, callId, gatherUrl, appUrl);
  }

  // Salva turno do usuário
  await prisma.phoneCallTurn.create({
    data: { callId, role: "user", content: speechResult },
  });

  // Monta histórico de conversa para o OpenAI
  const systemPrompt = buildPhoneSystemPrompt(agent);
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...call.turns
      .filter(t => t.role === "user" || t.role === "assistant")
      .map(t => ({
        role: t.role as "user" | "assistant",
        content: t.content,
      })),
    { role: "user", content: speechResult },
  ];

  let aiReply: string;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages,
    });
    aiReply = response.choices[0].message.content?.trim() ?? "Pode repetir?";
  } catch (e) {
    console.error("OpenAI error:", e);
    aiReply = "Desculpe, ocorreu um erro. Pode repetir?";
  }

  // Verifica se o agente quer encerrar (resposta começa com [FIM] ou usuário se despediu)
  const shouldEnd = aiReply.startsWith("[FIM]") || GOODBYE_PATTERNS.test(speechResult);
  const cleanReply = aiReply.replace(/^\[FIM\]\s*/i, "");

  // Salva turno do assistente
  const turn = await prisma.phoneCallTurn.create({
    data: { callId, role: "assistant", content: cleanReply },
  });

  if (shouldEnd) {
    await prisma.phoneCall.update({ where: { id: callId }, data: { status: "CONCLUIDA" } });

    if (agent.elevenlabsApiKey) {
      try {
        const audioBuffer = await textToSpeech(cleanReply, {
          apiKey: agent.elevenlabsApiKey,
          voiceId: agent.elevenlabsVoiceId ?? undefined,
        });
        await prisma.phoneCallTurn.update({
          where: { id: turn.id },
          data: { audioData: audioBuffer.toString("base64") },
        });
        const audioUrl = `${appUrl}/api/webhooks/twilio/${agentId}/audio/${turn.id}`;
        return new NextResponse(buildEndTwiml(audioUrl), {
          headers: { "Content-Type": "text/xml" },
        });
      } catch {
        // fallback abaixo
      }
    }
    return new NextResponse(
      `<?xml version="1.0"?><Response><Say language="pt-BR">${cleanReply}</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  return await speakAndGather(cleanReply, agent, agentId, callId, gatherUrl, appUrl, turn.id);
}

// Status callback do Twilio (chamada encerrada externamente)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return new NextResponse("ok");
}

async function speakAndGather(
  text: string,
  agent: { elevenlabsApiKey: string | null; elevenlabsVoiceId: string | null },
  agentId: string,
  callId: string,
  gatherUrl: string,
  appUrl: string,
  existingTurnId?: string
) {
  if (agent.elevenlabsApiKey) {
    try {
      const audioBuffer = await textToSpeech(text, {
        apiKey: agent.elevenlabsApiKey,
        voiceId: agent.elevenlabsVoiceId ?? undefined,
      });
      let turnId = existingTurnId;
      if (!turnId) {
        const t = await prisma.phoneCallTurn.create({
          data: { callId, role: "assistant", content: text, audioData: audioBuffer.toString("base64") },
        });
        turnId = t.id;
      } else {
        await prisma.phoneCallTurn.update({
          where: { id: turnId },
          data: { audioData: audioBuffer.toString("base64") },
        });
      }
      const audioUrl = `${appUrl}/api/webhooks/twilio/${agentId}/audio/${turnId}`;
      return new NextResponse(buildReplyTwiml({ audioUrl, gatherUrl }), {
        headers: { "Content-Type": "text/xml" },
      });
    } catch (e) {
      console.error("ElevenLabs TTS error:", e);
    }
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR">${text}</Say>
  <Gather input="speech" action="${gatherUrl}" method="POST"
          language="pt-BR" speechTimeout="auto" timeout="30">
  </Gather>
  <Say language="pt-BR">Não ouvi nada. Encerrando a ligação.</Say>
</Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

function buildPhoneSystemPrompt(agent: {
  nome: string;
  systemPrompt: string | null;
  descricaoEmpresa: string;
  phoneCallPrompt: string;
}): string {
  return `Você é ${agent.nome}, um assistente de IA que está realizando uma ligação telefônica em nome da empresa.

Regras importantes para ligações:
- Seja CONCISO: respostas curtas e diretas (máx 2-3 frases por vez), pois o usuário está ouvindo por telefone.
- Não use listas, markdown, emojis ou formatação — apenas texto falado natural.
- CONTINUE a conversa normalmente — só encerre com [FIM] se o usuário disser explicitamente "tchau", "até logo" ou pedir para desligar.
- Palavras como "obrigado", "tá", "sim", "não" são respostas normais — NÃO encerre a chamada por causa delas.
- Mantenha o tom natural e profissional como em uma ligação real.

${agent.descricaoEmpresa ? `Sobre a empresa:\n${agent.descricaoEmpresa}\n` : ""}${agent.phoneCallPrompt ? `\nInstruções adicionais:\n${agent.phoneCallPrompt}` : ""}`;
}

function twilioError(msg: string) {
  return new NextResponse(
    `<?xml version="1.0"?><Response><Say language="pt-BR">Erro interno. ${msg}</Say><Hangup/></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
