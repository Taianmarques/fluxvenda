import twilio from "twilio";

export function getTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}

// Gera TwiML de saudação: fala o texto e abre <Gather> para capturar fala
export function buildGreetingTwiml(params: {
  audioUrl: string;
  gatherUrl: string;
  callId: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(params.audioUrl)}</Play>
  <Gather input="speech" action="${escapeXml(params.gatherUrl)}" method="POST"
          language="pt-BR" speechTimeout="3" timeout="30">
  </Gather>
  <Say language="pt-BR">Não ouvi nada. Encerrando a ligação.</Say>
</Response>`;
}

// Gera TwiML de resposta: fala o texto e abre novo <Gather>
export function buildReplyTwiml(params: {
  audioUrl: string;
  gatherUrl: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(params.audioUrl)}</Play>
  <Gather input="speech" action="${escapeXml(params.gatherUrl)}" method="POST"
          language="pt-BR" speechTimeout="3" timeout="30">
  </Gather>
  <Say language="pt-BR">Não ouvi nada. Encerrando a ligação.</Say>
</Response>`;
}

// TwiML de encerramento (agente decide fechar)
export function buildEndTwiml(audioUrl?: string): string {
  if (audioUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(audioUrl)}</Play>
  <Hangup/>
</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Inicia chamada outbound
export async function makeOutboundCall(params: {
  accountSid: string;
  authToken: string;
  from: string;       // número Twilio
  to: string;         // número do contato
  voiceUrl: string;   // URL do webhook inicial
  statusCallbackUrl: string;
}): Promise<string> { // retorna callSid
  const client = getTwilioClient(params.accountSid, params.authToken);
  const call = await client.calls.create({
    from: params.from,
    to: params.to,
    url: params.voiceUrl,
    statusCallback: params.statusCallbackUrl,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["completed", "failed", "no-answer", "busy"],
  });
  return call.sid;
}
