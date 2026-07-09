// ElevenLabs TTS — gera áudio MP3 a partir de texto
// Retorna Buffer com os bytes do MP3

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // "Bella" — voz feminina neutra pt-BR razoável

export async function textToSpeech(
  text: string,
  options: {
    apiKey: string;
    voiceId?: string;
    modelId?: string;
  }
): Promise<Buffer> {
  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const modelId = options.modelId || "eleven_multilingual_v2";

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": options.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      language_code: "pt",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
