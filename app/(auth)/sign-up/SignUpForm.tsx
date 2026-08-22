"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function SignUpForm({ redirectUrl }: { redirectUrl: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a conta.");
        setSaving(false);
        return;
      }
      window.location.href = redirectUrl;
    } catch {
      setError("Não foi possível criar a conta. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Image src="/logoflux.png" alt="FluxVenda" width={200} height={50} className="mx-auto" priority />
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="text-gray-400 text-sm">Comece a usar a FluxVenda</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Seu nome"
            />
          </div>

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
              placeholder="Mínimo 8 caracteres, com letra e número"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
          >
            {saving ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-sm text-center text-gray-400">
            Já tem conta?{" "}
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
