"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Link2, XCircle, Building2 } from "lucide-react";

type TeamInfo = { name: string; segment: string; size: string; memberCount: number; managerName: string };

export default function EntrarCodigoPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const autoJoinedRef = useRef(false);

  useEffect(() => {
    fetch(`/api/equipe/convite?code=${code}`)
      .then(r => r.json())
      .then(d => { setTeam(d); setLoading(false); })
      .catch(() => { setError("Convite inválido ou expirado."); setLoading(false); });
  }, [code]);

  async function handleJoin() {
    // Convidado ainda sem conta: cria o acesso primeiro e volta pra cá já logado (?auto=1
    // completa a entrada sozinho). Sem isso, o POST abaixo seria redirecionado pro HTML do
    // login e o res.json() estourava com erro críptico no Safari.
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=${encodeURIComponent(`/entrar/${code}?auto=1`)}`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/equipe/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar na equipe. Tente novamente.");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar na equipe.");
      setJoining(false);
    }
  }

  // Voltou do cadastro (?auto=1): completa a entrada sem exigir outro toque no botão
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !team || autoJoinedRef.current) return;
    if (new URLSearchParams(window.location.search).has("auto")) {
      autoJoinedRef.current = true;
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, team]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <Link2 size={40} className="mx-auto text-blue-400 animate-pulse" />
          <p className="text-gray-400">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <XCircle size={48} className="mx-auto text-red-400" />
          <p className="text-red-400">{error || "Convite não encontrado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-3xl bg-blue-900/40 border border-blue-700 flex items-center justify-center mx-auto">
            <Building2 size={36} className="text-blue-300" />
          </div>
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

        <button onClick={handleJoin} disabled={joining || !isLoaded}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-colors">
          {joining ? "Entrando..." : isSignedIn ? "Entrar na equipe" : "Criar conta e entrar"}
        </button>
        {!isSignedIn && isLoaded && (
          <p className="text-xs text-gray-500 text-center -mt-4">
            Você cria seu acesso e entra na equipe automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
