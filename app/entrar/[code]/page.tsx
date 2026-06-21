"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TeamInfo = { name: string; segment: string; size: string; memberCount: number; managerName: string };

export default function EntrarCodigoPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/equipe/convite?code=${code}`)
      .then(r => r.json())
      .then(d => { setTeam(d); setLoading(false); })
      .catch(() => { setError("Convite inválido ou expirado."); setLoading(false); });
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch("/api/equipe/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message); setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">🔗</div>
          <p className="text-gray-400">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-5xl">❌</p>
          <p className="text-red-400">{error || "Convite não encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl bg-blue-900/40 border border-blue-700 flex items-center justify-center text-4xl mx-auto">🏢</div>
          <p className="text-gray-400 text-sm">Você foi convidado para</p>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-gray-400">{team.segment}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Gestor</span>
            <span className="font-medium">{team.managerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Segmento</span>
            <span className="font-medium">{team.segment}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Membros na equipe</span>
            <span className="font-medium">{team.memberCount} pessoas</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button onClick={handleJoin} disabled={joining}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-colors">
          {joining ? "Entrando..." : "✅ Entrar na equipe"}
        </button>
      </div>
    </div>
  );
}
