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
  // Instagram Business Login: /me retorna `id` (app-scoped) e `user_id` (ID profissional
  // 17841... — o mesmo que chega em entry.id nos webhooks). Salvamos o user_id.
  const meRes = await fetch(`https://graph.instagram.com/me?fields=user_id,username,id&access_token=${accessToken}`);
  const meData = await meRes.json();
  if (meRes.ok && !meData.error && (meData.user_id || meData.id)) {
    console.log("[instagram] /me returned user_id:", meData.user_id, "id:", meData.id, "username:", meData.username);
    return { igUserId: String(meData.user_id ?? meData.id), username: meData.username ?? "" };
  }
  console.warn("[instagram] /me failed:", meData.error?.message, "— falling back to userId");
  return { igUserId: userId, username: "" };
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export async function subscribeInstagramWebhook(igUserId: string, accessToken: string): Promise<void> {
  // /me/subscribed_apps — o token de Business Login identifica a conta, não usar ID na URL
  const res = await fetch(`${IG_GRAPH}/me/subscribed_apps?subscribed_fields=messages,comments&access_token=${accessToken}`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok || data.error) console.warn("[instagram] webhook subscribe:", data.error?.message ?? res.status);
  else console.log("[instagram] webhook subscribed ok");
}

export async function unsubscribeInstagramWebhook(igUserId: string, accessToken: string): Promise<void> {
  await fetch(
    `${IG_GRAPH}/me/subscribed_apps?subscribed_fields=messages&access_token=${accessToken}`,
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
  // /me/messages — o token de Business Login identifica a conta remetente
  const res = await fetch(`${IG_GRAPH}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Falha ao enviar DM");
}
