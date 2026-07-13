"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: unknown) => void)[];
  }
}

// Carrega o SDK do OneSignal e vincula o usuário logado (external_id = id do Clerk) —
// assim o servidor notifica por usuário sem guardar token de push no nosso banco.
// A permissão de notificação NÃO é pedida aqui: só no clique do botão (NotificationsButton).
export function OneSignalInit({ userId }: { userId: string }) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    if (!document.getElementById("onesignal-sdk")) {
      const s = document.createElement("script");
      s.id = "onesignal-sdk";
      s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      s.defer = true;
      document.head.appendChild(s);
    }
    window.OneSignalDeferred.push(async (OneSignal) => {
      const os = OneSignal as { init: (o: object) => Promise<void>; login: (id: string) => Promise<void> };
      try {
        await os.init({ appId, allowLocalhostAsSecureOrigin: true });
        await os.login(userId);
      } catch {
        // init roda uma vez por página — chamadas repetidas (HMR/navegação) podem lançar; ignora
      }
    });
  }, [userId]);

  return null;
}
