"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function RedefinirSenhaForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível redefinir a senha.");
        setSaving(false);
        return;
      }
      window.location.href = data.onboarded === false ? "/onboarding" : "/dashboard";
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-gray-300">Link inválido. Peça uma nova redefinição de senha.</p>
          <Link href="/esqueci-senha" className="text-blue-400 hover:text-blue-300 transition-colors">
            Esqueci minha senha
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Image src="/logoflux.png" alt="FluxVenda" width={200} height={50} className="mx-auto" priority />
          <h1 className="text-2xl font-bold">Definir nova senha</h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nova senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Mínimo 8 caracteres, com letra e número"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
