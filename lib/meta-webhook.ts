// Helpers compartilhados por webhooks da Meta (Instagram, WhatsApp Cloud API) — mesmo
// protocolo de verificação em ambos os produtos do Graph API.

import { createHmac } from "crypto";

// Handshake GET: a Meta chama com hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// Cada canal compara o token com o seu próprio verify token (global via env, ou por agente).
export function verifyMetaHandshake(mode: string | null, token: string | null, expectedToken: string | null | undefined): boolean {
  return mode === "subscribe" && Boolean(expectedToken) && token === expectedToken;
}

// Verificação de assinatura HMAC do corpo (X-Hub-Signature-256). Se appSecret não estiver
// configurado, pula a verificação (mesmo comportamento relaxado já usado no webhook do Instagram).
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string | undefined): boolean {
  if (!signatureHeader || !appSecret) return true;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return signatureHeader === expected;
}
