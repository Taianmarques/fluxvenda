const IG_AUTH = "https://api.instagram.com";
const IG_GRAPH = "https://graph.instagram.com/v21.0";

// ─── OAuth: Instagram Business Login ─────────────────────────────────────────

export async function exchangeInstagramCode(code: string, redirectUri: string): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${IG_AUTH}/oauth/access_token`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || data.error_message || data.error) throw new Error(data.error_message ?? data.error?.message ?? "Falha na troca do código OAuth");
  return { accessToken: data.access_token as string, userId: String(data.user_id) };
}

export async function getInstagramLongLivedToken(shortToken: string): Promise<{ token: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  });
  // Token exchange uses the base URL without version
  const res = await fetch(`https://graph.instagram.com/access_token?${params}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    // Instagram Business Login tokens são válidos por 60 dias — usa o token diretamente como fallback
    console.warn("[instagram] token exchange failed, using short-lived token:", data.error?.message);
    return { token: shortToken, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) };
  }
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000);
  return { token: data.access_token, expiresAt };
}

export async function getInstagramUserInfo(accessToken: string, userId: string): Promise<{ igUserId: string; username: string }> {
  // Fetch username by user ID — avoids /me endpoint issues with new Instagram Platform
  const res = await fetch(`${IG_GRAPH}/${userId}?fields=id,username&access_token=${accessToken}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    console.warn("[instagram] getInstagramUserInfo error:", data.error?.message);
    return { igUserId: userId, username: "" };
  }
  return { igUserId: String(data.id ?? userId), username: data.username ?? "" };
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
