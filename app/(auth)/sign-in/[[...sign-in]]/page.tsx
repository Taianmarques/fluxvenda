"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useClerk } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";
  const { session } = useClerk();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao entrar");
      // Sem isso, o AuthProvider (montado uma vez no layout raiz) continua achando que
      // ninguém está logado até um reload de página inteira — quebra o auto-join do convite
      // e qualquer página que leia useUser() logo depois do login.
      await session.reload();
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1C140D] text-[#FDF9F2] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <Image src="/logo-sfmadeiras.png" alt="SF Madeiras" width={220} height={88} className="mx-auto h-auto w-[220px]" priority />
          <p className="text-[#E3D9C6] text-sm">Entre com seu e-mail e senha</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-[#E3D9C6]">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 bg-[#2A1D14] border border-[#3D2B1D] rounded-xl text-[#FDF9F2] placeholder-[#E3D9C6]/40 focus:outline-none focus:border-[#E8A93A] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[#E3D9C6]">Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-[#2A1D14] border border-[#3D2B1D] rounded-xl text-[#FDF9F2] placeholder-[#E3D9C6]/40 focus:outline-none focus:border-[#E8A93A] transition-colors"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3.5 bg-[#E8A93A] hover:bg-[#dd9d2e] disabled:opacity-50 rounded-xl font-bold text-[#1C140D] transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-[#E3D9C6]/70">
          Não tem conta? <Link href="/sign-up" className="text-[#E8A93A] hover:text-[#dd9d2e] underline">Criar conta</Link>
        </p>
      </form>
    </div>
  );
}
