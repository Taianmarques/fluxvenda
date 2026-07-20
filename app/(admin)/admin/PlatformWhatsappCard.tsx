"use client";

import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type Status = {
  configured: boolean;
  connected?: boolean;
  profileName?: string | null;
  ownerNumber?: string | null;
};

// Status do WhatsApp GLOBAL da plataforma (mensagens de boas-vindas do cadastro).
// Desconectado, os envios falham em silêncio — esse card torna o problema visível
// e permite reconectar por QR sem sair do painel.
export function PlatformWhatsappCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  async function refresh() {
    try {
      const res = await fetch("/api/admin/whatsapp-plataforma");
      if (!res.ok) return;
      const data = (await res.json()) as Status;
      setStatus(data);
      if (data.connected) setQrcode(null); // conectou: some com o QR
    } catch {}
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  async function gerarQr() {
    setGerando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/whatsapp-plataforma", { method: "POST" });
      const data = await res.json().catch(() => ({} as { qrcode?: string; error?: string }));
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível gerar o QR.");
        return;
      }
      if (data.qrcode) {
        setQrcode(data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`);
      } else {
        setErro("A UazAPI não devolveu um QR — tente de novo em alguns segundos.");
      }
    } finally {
      setGerando(false);
    }
  }

  if (!status || !status.configured) return null;

  if (status.connected) {
    return (
      <div className="bg-gray-900 border border-green-800/50 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">WhatsApp da plataforma conectado</p>
          <p className="text-xs text-gray-500 truncate">
            {status.profileName ?? "Instância"} · {status.ownerNumber ?? "sem número"} — boas-vindas do cadastro sendo enviadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-300">WhatsApp da plataforma DESCONECTADO</p>
          <p className="text-xs text-gray-400">
            As mensagens de boas-vindas do cadastro não estão sendo enviadas. Reconecte escaneando o QR
            com o celular do número {status.ownerNumber ?? "da plataforma"}.
          </p>
        </div>
        <button
          onClick={gerarQr}
          disabled={gerando}
          className="flex items-center gap-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-3 py-2 flex-shrink-0"
        >
          {gerando ? <RefreshCw size={13} className="animate-spin" /> : <MessageCircle size={13} />}
          {qrcode ? "Gerar novo QR" : "Gerar QR de conexão"}
        </button>
      </div>

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      {qrcode && (
        <div className="flex items-center gap-4 bg-white rounded-xl p-3 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrcode} alt="QR de conexão do WhatsApp" className="w-44 h-44" />
          <div className="text-gray-800 text-xs max-w-[180px] space-y-1">
            <p className="font-semibold">No celular do número da plataforma:</p>
            <p>WhatsApp → Aparelhos conectados → Conectar um aparelho → escanear.</p>
            <p className="text-gray-500">O QR expira em ±1 minuto — se falhar, gere outro.</p>
          </div>
        </div>
      )}
    </div>
  );
}
