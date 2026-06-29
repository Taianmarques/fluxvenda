"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type Status = {
  connected: boolean;
  qrcode: string | null;
  paircode: string | null;
  profileName?: string | null;
  ownerNumber?: string | null;
};

function toImageSrc(qrcode: string): string {
  return qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`;
}

export function QrConnect() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startConnect() {
    setError("");
    try {
      const res = await fetch("/api/ferramentas/whatsapp/conectar", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: Status = await res.json();
      setStatus(data);
    } catch {
      setError("Não foi possível gerar o QR code. Tente novamente.");
    }
  }

  async function poll() {
    try {
      const res = await fetch("/api/ferramentas/whatsapp/conectar");
      if (!res.ok) return;
      const data: Status = await res.json();
      setStatus(data);
      if (data.connected) {
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => router.refresh(), 1200);
      }
    } catch {}
  }

  useEffect(() => {
    startConnect();
    pollRef.current = setInterval(poll, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (status?.connected) {
    return (
      <div className="bg-gray-900 border border-green-800/50 rounded-2xl p-6 text-center space-y-2">
        <CheckCircle2 size={32} className="mx-auto text-green-400" />
        <p className="font-semibold text-green-300">Conectado!</p>
        <p className="text-sm text-gray-400">{status.profileName ?? "WhatsApp"} pareado com sucesso. Ativando o agente...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
      {status?.qrcode ? (
        <img src={toImageSrc(status.qrcode)} alt="QR code do WhatsApp" className="mx-auto rounded-xl w-56 h-56 bg-white p-2" />
      ) : (
        <div className="w-56 h-56 mx-auto rounded-xl bg-gray-800 animate-pulse flex items-center justify-center text-sm text-gray-500">
          Gerando QR code...
        </div>
      )}

      {status?.paircode && (
        <p className="text-sm text-gray-400">Ou use o código de pareamento: <span className="font-mono text-gray-200">{status.paircode}</span></p>
      )}

      <p className="text-xs text-gray-500">Abra o WhatsApp no celular do número da empresa → Dispositivos conectados → Conectar dispositivo.</p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button onClick={startConnect} className="text-sm text-blue-400 hover:text-blue-300">
        Gerar novo QR code
      </button>
    </div>
  );
}
