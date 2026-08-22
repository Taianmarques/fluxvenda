"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function SignInForm({ redirectUrl, initialNotice }: { redirectUrl: string; initialNotice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsReset, setNeedsReset] = useState(false);
  const [notice] = useState(initialNotice ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNeedsReset(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        if (data.code === "NEEDS_PASSWORD_RESET") setNeedsReset(true);
        setSaving(false);
        return;
      }
      window.location.href = data.onboarded === false ? "/onboarding" : redirectUrl;
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Image src="/logoflux.png" alt="FluxVenda" width={200} height={50} className="mx-auto" priority />
          <p className="text-gray-400 text-sm">
            Acesse sua conta ou{" "}
            <Link href="/sign-up?product=crm" className="text-blue-400 hover:text-blue-300 transition-colors">
              experimente grátis por 7 dias
            </Link>
          </p>
        </div>

        {notice && <p className="text-green-400 text-sm text-center">{notice}</p>}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">
              {error}
              {needsReset && (
                <>
                  {" "}
                  <Link href="/esqueci-senha" className="underline text-blue-400">
                    Definir senha
                  </Link>
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
          >
            {saving ? "Entrando..." : "Entrar"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/esqueci-senha" className="text-gray-400 hover:text-white transition-colors">
              Esqueci minha senha
            </Link>
            <Link href="/sign-up?product=crm" className="text-blue-400 hover:text-blue-300 transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
