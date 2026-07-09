import { prisma } from "../lib/prisma";
import { textToSpeech } from "../lib/elevenlabs";
import { makeOutboundCall } from "../lib/twilio-voice";

const AGENT_ID = "cmqoisa4k000080wbnf2h1p4a";
const TO_NUMBER = "+5584987588002";
const NGROK_URL = "https://rebate-glamour-handcuff.ngrok-free.dev";

async function main() {
  const agent = await prisma.agentConfig.findUnique({
    where: { id: AGENT_ID },
    select: {
      nome: true,
      elevenlabsApiKey: true,
      elevenlabsVoiceId: true,
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioPhoneNumber: true,
    },
  });

  if (!agent) { console.error("Agente não encontrado"); return; }

  console.log("Agente:", agent.nome);

  // 1. Cria o PhoneCall
  const call = await prisma.phoneCall.create({
    data: {
      agentConfigId: AGENT_ID,
      direction: "OUTBOUND",
      contactNumber: TO_NUMBER,
      contactName: "Teste real",
      status: "EM_ANDAMENTO",
    },
  });
  console.log("PhoneCall criado:", call.id);

  // 2. Pré-gera áudio de saudação com ElevenLabs
  const saudacao = `Olá! Aqui é ${agent.nome} da FluxVenda. Estou ligando para apresentar nossa plataforma de treinamento em vendas. Você tem um minutinho?`;
  console.log("Gerando áudio de saudação...");
  const audioBuffer = await textToSpeech(saudacao, {
    apiKey: agent.elevenlabsApiKey!,
    voiceId: agent.elevenlabsVoiceId ?? undefined,
  });
  const turn = await prisma.phoneCallTurn.create({
    data: {
      callId: call.id,
      role: "assistant",
      content: saudacao,
      audioData: audioBuffer.toString("base64"),
    },
  });
  console.log(`Áudio gerado: ${audioBuffer.length} bytes | turn: ${turn.id}`);

  // 3. Verifica que o áudio está acessível via ngrok
  const audioUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/audio/${turn.id}`;
  const audioCheck = await fetch(audioUrl);
  console.log(`Audio URL check: HTTP ${audioCheck.status} (${(await audioCheck.arrayBuffer()).byteLength} bytes)`);

  // 4. Dispara a chamada Twilio com callId pré-criado na URL do voice webhook
  const voiceUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/voice?callId=${call.id}`;
  const statusUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/status`;
  console.log("Voice URL:", voiceUrl);

  const callSid = await makeOutboundCall({
    accountSid: agent.twilioAccountSid!,
    authToken: agent.twilioAuthToken!,
    from: agent.twilioPhoneNumber!,
    to: TO_NUMBER,
    voiceUrl,
    statusCallbackUrl: statusUrl,
  });

  await prisma.phoneCall.update({ where: { id: call.id }, data: { twilioCallSid: callSid } });
  console.log("Chamada disparada! CallSid:", callSid);
  console.log("Aguardando seu telefone tocar...");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
