"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLogo } from "@/app/AuthLogo";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <AuthLogo />
          <p className="text-gray-500 text-sm">
            Acesse sua conta ou{" "}
            <Link href="/sign-up?product=crm" className="text-blue-600 hover:text-blue-700 transition-colors">
              experimente grátis por 7 dias
            </Link>
          </p>
        </div>

        {notice && <p className="text-green-600 text-sm text-center">{notice}</p>}

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">
              {error}
              {needsReset && (
                <>
                  {" "}
                  <Link href="/esqueci-senha" className="underline text-blue-600">
                    Definir senha
                  </Link>
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-white transition-colors"
          >
            {saving ? "Entrando..." : "Entrar"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/esqueci-senha" className="text-gray-500 hover:text-gray-900 transition-colors">
              Esqueci minha senha
            </Link>
            <Link href="/sign-up?product=crm" className="text-blue-600 hover:text-blue-700 transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
