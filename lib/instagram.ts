const IG_AUTH = "https://api.instagram.com";
const IG_GRAPH = "https://graph.instagram.com/v21.0";

// ─── OAuth: Instagram Business Login ─────────────────────────────────────────

export async function exchangeInstagramCode(code: string, redirectUri: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${IG_AUTH}/oauth/access_token`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || data.error_message) throw new Error(data.error_message ?? "Falha na troca do código OAuth");
  return data.access_token as string;
}

export async function getInstagramLongLivedToken(shortToken: string): Promise<{ token: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  });
  const res = await fetch(`${IG_GRAPH}/access_token?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Falha ao obter token de longa duração");
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000);
  return { token: data.access_token, expiresAt };
}

export async function getInstagramUserInfo(accessToken: string): Promise<{ igUserId: string; username: string }> {
  const res = await fetch(`${IG_GRAPH}/me?fields=id,username&access_token=${accessToken}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Falha ao obter dados do usuário");
  return { igUserId: String(data.id), username: data.username ?? "" };
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function subscribeInstagramWebhook(igUserId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${IG_GRAPH}/${igUserId}/subscribed_apps`, {
    method: "POST",
    body: new URLSearchParams({ subscribed_fields: "messages,comments", access_token: accessToken }),
  });
  const data = await res.json();
  if (!res.ok && data.error) console.warn("[instagram] webhook subscribe:", data.error?.message);
}

export async function unsubscribeInstagramWebhook(igUserId: string, accessToken: string): Promise<void> {
  await fetch(
    `${IG_GRAPH}/${igUserId}/subscribed_apps?subscribed_fields=messages&access_token=${accessToken}`,
    { method: "DELETE" }
  ).catch(() => {});
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

export async function sendInstagramDM(
  igUserId: string,
  accessToken: string,
  recipientIgsid: string,
  text: string
): Promise<void> {
  const res = await fetch(`${IG_GRAPH}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
      messaging_type: "RESPONSE",
      access_token: accessToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Falha ao enviar DM");
}
