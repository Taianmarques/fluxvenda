const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Envia web push via OneSignal pros usuários indicados (external_id = id do Clerk,
// vinculado no login pelo OneSignalInit). Fire-and-forget: falha nunca quebra o fluxo.
export async function notifyUsers(userIds: string[], titulo: string, mensagem: string, url?: string): Promise<void> {
  if (!APP_ID || !API_KEY || userIds.length === 0) return;
  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${API_KEY}`,
      },
      body: JSON.stringify({
        app_id: APP_ID,
        include_aliases: { external_id: userIds },
        target_channel: "push",
        headings: { en: titulo },
        contents: { en: mensagem },
        ...(url ? { url } : {}),
      }),
    });
    if (!res.ok) console.warn("[onesignal] envio falhou:", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.warn("[onesignal] erro ao enviar:", err);
  }
}
