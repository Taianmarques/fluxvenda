import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeInstagramCode,
  getInstagramLongLivedToken,
  getInstagramUserInfo,
  subscribeInstagramWebhook,
} from "@/lib/instagram";

function htmlResponse(html: string) {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function closePage(origin: string, payload: object) {
  return htmlResponse(`<!DOCTYPE html><html><head><title>Instagram</title></head><body>
<script>
  try { window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(origin)}); } catch(e){}
  window.close();
</script>
<noscript><p>Pode fechar essa janela.</p></noscript>
</body></html>`);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  if (errorParam) {
    return closePage(appOrigin, { type: "INSTAGRAM_ERROR", message: "Autorização cancelada." });
  }
  if (!code || !state) {
    return closePage(appOrigin, { type: "INSTAGRAM_ERROR", message: "Parâmetros inválidos." });
  }

  const oauthState = await prisma.oAuthState.findUnique({ where: { state } });
  if (!oauthState || oauthState.used || oauthState.expiresAt < new Date()) {
    return closePage(appOrigin, { type: "INSTAGRAM_ERROR", message: "Sessão expirada. Tente novamente." });
  }

  await prisma.oAuthState.update({ where: { id: oauthState.id }, data: { used: true } });

  const redirectUri = `${appOrigin}/api/instagram/callback`;

  try {
    // 1. Troca code por short-lived token + obtém userId
    console.log("[ig-cb] step1: exchanging code");
    const { accessToken: shortToken, userId: shortUserId } = await exchangeInstagramCode(code, redirectUri);
    console.log("[ig-cb] step1 ok, userId:", shortUserId);

    // 2. Troca por long-lived token (~60 dias)
    console.log("[ig-cb] step2: getting long-lived token");
    const { token, expiresAt } = await getInstagramLongLivedToken(shortToken);
    console.log("[ig-cb] step2 ok");

    // 3. Dados da conta Instagram Business (username via userId)
    console.log("[ig-cb] step3: getting user info for", shortUserId);
    const { igUserId, username } = await getInstagramUserInfo(token, shortUserId);
    console.log("[ig-cb] step3 ok, igUserId:", igUserId, "username:", username);

    // 4. Salva (ou atualiza) a conexão — pageId reutilizado para armazenar o IG user ID
    await prisma.instagramConnection.upsert({
      where: { agentConfigId: oauthState.agentConfigId },
      update: {
        pageId: igUserId,
        pageAccessToken: token,
        instagramBusinessAccountId: igUserId,
        instagramUsername: username,
        tokenExpiresAt: expiresAt,
        webhookSubscribed: true,
      },
      create: {
        agentConfigId: oauthState.agentConfigId,
        pageId: igUserId,
        pageAccessToken: token,
        instagramBusinessAccountId: igUserId,
        instagramUsername: username,
        tokenExpiresAt: expiresAt,
        webhookSubscribed: true,
      },
    });

    // 5. Ativa recebimento de DMs (best-effort)
    await subscribeInstagramWebhook(igUserId, token).catch(() => {});

    return closePage(appOrigin, {
      type: "INSTAGRAM_CONNECTED",
      agentId: oauthState.agentConfigId,
      username,
      businessAccountId: igUserId,
    });
  } catch (err: any) {
    console.error("[instagram-callback]", err);
    const isUniqueConflict = err?.code === "P2002";
    return closePage(appOrigin, {
      type: "INSTAGRAM_ERROR",
      message: isUniqueConflict
        ? "Essa conta Instagram já está vinculada a outro agente."
        : (err.message ?? "Erro ao conectar o Instagram. Tente novamente."),
    });
  }
}
