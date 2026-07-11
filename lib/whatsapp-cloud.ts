// WhatsApp Cloud API (Meta oficial) — alternativa à UazAPI, escolhida via AgentConfig.whatsappProvider.
// Fetch cru contra o Graph API, sem SDK — mesmo estilo de lib/whatsapp.ts e lib/elevenlabs.ts.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function graphFetch(url: string, accessToken: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`WhatsApp Cloud API error: ${msg}`);
  }
  return data;
}

export async function sendCloudText(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<void> {
  await graphFetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formatPhone(to),
      type: "text",
      text: { body: text },
    }),
  });
}

export type TemplateComponent = {
  type: "header" | "body" | "button";
  parameters: { type: "text"; text: string }[];
};

export async function sendCloudTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[]
): Promise<void> {
  await graphFetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formatPhone(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 && { components }),
      },
    }),
  });
}

// A Cloud API não aceita base64 direto na mensagem — precisa subir a mídia primeiro e referenciar o media_id.
export async function uploadCloudMedia(phoneNumberId: string, accessToken: string, base64: string, mimetype: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([buffer], { type: mimetype }));

  const data = await graphFetch(`${GRAPH_BASE}/${phoneNumberId}/media`, accessToken, {
    method: "POST",
    body: form,
  });
  return data.id;
}

export type CloudMediaType = "image" | "video" | "audio" | "document";

export async function sendCloudMedia(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  type: CloudMediaType,
  base64: string,
  opts?: { caption?: string; mimetype?: string; fileName?: string }
): Promise<void> {
  const mimetype = opts?.mimetype ?? (type === "audio" ? "audio/mpeg" : type === "image" ? "image/jpeg" : "application/octet-stream");
  const mediaId = await uploadCloudMedia(phoneNumberId, accessToken, base64, mimetype);

  await graphFetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: formatPhone(to),
      type,
      [type]: {
        id: mediaId,
        ...(opts?.caption && type !== "audio" && { caption: opts.caption }),
        ...(opts?.fileName && type === "document" && { filename: opts.fileName }),
      },
    }),
  });
}

// Baixa uma mídia recebida (áudio, imagem) — diferente da UazAPI, a URL da mídia da Meta
// exige o Bearer token no header do download, então não dá pra usar direto num <img>/fetch simples.
export async function downloadCloudMedia(mediaId: string, accessToken: string): Promise<{ buffer: Buffer; mimetype: string }> {
  const meta = await graphFetch(`${GRAPH_BASE}/${mediaId}`, accessToken);
  const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Erro ao baixar mídia da Cloud API: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimetype: meta.mime_type ?? "application/octet-stream" };
}

export type MessageTemplate = {
  name: string;
  status: string;
  language: string;
  category: string;
  components: { type: string; text?: string; format?: string }[];
};

export async function listMessageTemplates(wabaId: string, accessToken: string): Promise<MessageTemplate[]> {
  const data = await graphFetch(
    `${GRAPH_BASE}/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`,
    accessToken
  );
  const templates = (data.data ?? []) as MessageTemplate[];
  return templates.filter(t => t.status === "APPROVED");
}

export async function getPhoneNumberInfo(phoneNumberId: string, accessToken: string): Promise<{ displayPhoneNumber: string; verifiedName: string }> {
  const data = await graphFetch(`${GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`, accessToken);
  return { displayPhoneNumber: data.display_phone_number ?? "", verifiedName: data.verified_name ?? "" };
}
