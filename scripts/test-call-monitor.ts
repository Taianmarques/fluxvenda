import { prisma } from "../lib/prisma";
import { textToSpeech } from "../lib/elevenlabs";
import { makeOutboundCall } from "../lib/twilio-voice";

const AGENT_ID = process.env.TEST_AGENT_ID ?? "";
const TO_NUMBER = process.env.TEST_TO_NUMBER ?? "";
const NGROK_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";

async function getCallStatus(callSid: string) {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls/${callSid}.json`,
    { headers: { Authorization: "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64") } }
  );
  return res.json() as Promise<{ status: string; duration: string }>;
}

async function main() {
  const agent = await prisma.agentConfig.findUnique({
    where: { id: AGENT_ID },
    select: { nome: true, elevenlabsApiKey: true, elevenlabsVoiceId: true, twilioAccountSid: true, twilioAuthToken: true, twilioPhoneNumber: true },
  });
  if (!agent) { console.error("Agente não encontrado"); return; }

  console.log(`\n=== TESTE COMPLETO — Agente: ${agent.nome} ===\n`);

  // 1. Cria PhoneCall
  const call = await prisma.phoneCall.create({
    data: { agentConfigId: AGENT_ID, direction: "OUTBOUND", contactNumber: TO_NUMBER, contactName: "Teste conversa", status: "EM_ANDAMENTO" },
  });
  console.log("PhoneCall:", call.id);

  // 2. Pré-gera saudação
  const saudacao = `Olá! Aqui é ${agent.nome} da FluxVenda. Tudo bem? Posso falar um instante?`;
  process.stdout.write("Gerando saudação ElevenLabs... ");
  const audio = await textToSpeech(saudacao, { apiKey: agent.elevenlabsApiKey!, voiceId: agent.elevenlabsVoiceId ?? undefined });
  const turn = await prisma.phoneCallTurn.create({
    data: { callId: call.id, role: "assistant", content: saudacao, audioData: audio.toString("base64") },
  });
  console.log(`OK (${Math.round(audio.length / 1024)}KB)`);

  // 3. Verifica audio acessível via ngrok
  const audioUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/audio/${turn.id}`;
  const check = await fetch(audioUrl);
  console.log(`Audio URL: ${check.status === 200 ? "✓ acessível" : "✗ ERRO " + check.status}`);

  // 4. Contagem regressiva para o usuário se preparar
  console.log("\n⚠️  PEGUE O CELULAR AGORA — ligando em:");
  for (let i = 10; i >= 1; i--) {
    process.stdout.write(`  ${i}...\r`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("  LIGANDO AGORA!              ");

  // Inicia chamada
  const voiceUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/voice?callId=${call.id}`;
  const statusUrl = `${NGROK_URL}/api/webhooks/twilio/${AGENT_ID}/status`;
  const callSid = await makeOutboundCall({
    accountSid: agent.twilioAccountSid!, authToken: agent.twilioAuthToken!,
    from: agent.twilioPhoneNumber!, to: TO_NUMBER, voiceUrl, statusCallbackUrl: statusUrl,
  });
  await prisma.phoneCall.update({ where: { id: call.id }, data: { twilioCallSid: callSid } });
  console.log(`\nChamada disparada! SID: ${callSid}`);
  console.log(">>> ATENDA O TELEFONE E FALE APÓS A SAUDAÇÃO <<<\n");

  // 5. Monitora turns e status em tempo real
  let knownTurnIds = new Set<string>([turn.id]);
  let lastStatus = "queued";
  let ticks = 0;

  const interval = setInterval(async () => {
    ticks++;

    // Verifica status da chamada no Twilio
    if (ticks % 3 === 0) {
      const tw = await getCallStatus(callSid);
      if (tw.status !== lastStatus) {
        lastStatus = tw.status;
        console.log(`\n[Twilio] Status: ${tw.status.toUpperCase()} | Duração: ${tw.duration || "—"}s`);
      }
      if (["completed", "failed", "no-answer", "busy", "canceled"].includes(tw.status)) {
        clearInterval(interval);
        await showFinalSummary(call.id);
        process.exit(0);
      }
    }

    // Busca novos turns da conversa
    const turns = await prisma.phoneCallTurn.findMany({
      where: { callId: call.id },
      orderBy: { createdAt: "asc" },
    });

    for (const t of turns) {
      if (!knownTurnIds.has(t.id)) {
        knownTurnIds.add(t.id);
        const icon = t.role === "user" ? "👤" : "🤖";
        const label = t.role === "user" ? "CLIENTE" : "AGENTE (IA)";
        console.log(`\n${icon} [${label}]: ${t.content}`);
        if (t.audioData) console.log(`   ↳ Áudio ElevenLabs: ${Math.round(t.audioData.length * 0.75 / 1024)}KB`);
      }
    }

    // Timeout de segurança: 3 minutos
    if (ticks > 60) {
      console.log("\n[Timeout] 3 minutos encerrados.");
      clearInterval(interval);
      await showFinalSummary(call.id);
      process.exit(0);
    }
  }, 3000);
}

async function showFinalSummary(callId: string) {
  const finalCall = await prisma.phoneCall.findUnique({
    where: { id: callId },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!finalCall) return;
  console.log(`\n=== RESUMO FINAL ===`);
  console.log(`Status: ${finalCall.status} | Duração: ${finalCall.durationSecs ?? "—"}s`);
  console.log(`Turns: ${finalCall.turns.length}`);
  finalCall.turns.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.role}] ${t.content.slice(0, 100)}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
