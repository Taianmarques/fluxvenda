"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Link2 } from "lucide-react";

export default function EntrarPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    if (!code.trim()) return;
    // Sem conta ainda: cria o acesso e cai direto na página do convite, que completa a entrada
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=${encodeURIComponent(`/entrar/${code.trim()}?auto=1`)}`);
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/equipe/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(data.error ?? "Código inválido");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-blue-900/40 border border-blue-700 flex items-center justify-center mx-auto"><Link2 size={36} className="text-blue-300" /></div>
          <h1 className="text-2xl font-bold">Entrar em uma equipe</h1>
          <p className="text-gray-400 text-sm">Peça ao seu gestor o link ou código de convite da equipe.</p>
        </div>

        <div className="space-y-4">
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="Cole o código de convite aqui"
            className="w-full px-4 py-4 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-center text-sm tracking-wider" />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={handleJoin} disabled={!code.trim() || loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold transition-colors">
            {loading ? "Entrando..." : "Entrar na equipe"}
          </button>
        </div>

        <div className="border-t border-gray-800 pt-6 space-y-1">
          <p className="text-gray-500 text-sm">Prefere explorar por conta própria?</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm underline">
            Ir para o dashboard individual →
          </Link>
        </div>
      </div>
    </div>
  );
}
