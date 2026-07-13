"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

// Botão de ativar web push (OneSignal) — pede a permissão só no clique, nunca no carregamento.
// O SDK já foi carregado e o usuário vinculado pelo OneSignalInit no layout.
// `compact`: só o sininho, pra barra horizontal do CRM no celular.
export function NotificationsButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") { setStatus("unsupported"); return; }
    setStatus(Notification.permission);
  }, []);

  function ativar() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      const os = OneSignal as { Notifications: { requestPermission: () => Promise<void> } };
      try {
        await os.Notifications.requestPermission();
      } finally {
        if (typeof Notification !== "undefined") setStatus(Notification.permission);
      }
    });
  }

  if (status === "unsupported" || !process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return null;

  if (compact) {
    if (status === "granted") {
      return (
        <span className="p-2 flex-shrink-0" title="Notificações ativas">
          <BellRing size={17} className="text-green-500" />
        </span>
      );
    }
    return (
      <button
        onClick={ativar}
        title={status === "denied" ? "Notificações bloqueadas — libere nas permissões do navegador" : "Ativar notificações"}
        className="p-2 flex-shrink-0 text-gray-400 hover:text-white"
        aria-label="Ativar notificações"
      >
        {status === "denied" ? <BellOff size={17} /> : <Bell size={17} />}
      </button>
    );
  }

  if (status === "granted") {
    return (
      <p className="flex items-center gap-3 px-3 py-2 text-xs text-gray-500">
        <BellRing size={15} className="text-green-500" />
        Notificações ativas
      </p>
    );
  }

  return (
    <button
      onClick={ativar}
      title={status === "denied" ? "Notificações bloqueadas — libere nas permissões do navegador" : "Receber aviso de mensagens e agendamentos"}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      <Bell size={15} />
      {status === "denied" ? "Notificações bloqueadas" : "Ativar notificações"}
    </button>
  );
}
