"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@/lib/auth-client";

// ?redirect_url= vem do fluxo de convite (/entrar) — tem prioridade. ?product=crm|plataforma
// vem das landing pages dedicadas e manda pro onboarding específico de cada produto.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrlParam = searchParams.get("redirect_url");
  const product = searchParams.get("product");
  const validProduct = product === "crm" || product === "plataforma" ? product : null;
  const redirectUrl = redirectUrlParam || (validProduct ? `/onboarding/${validProduct}` : "/onboarding");
  const { session } = useClerk();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar conta");
      // Sem isso, o AuthProvider (montado uma vez no layout raiz) continua achando que
      // ninguém está logado até um reload de página inteira — quebra o auto-join do convite
      // (/entrar/[code]?auto=1) e o onboarding, que lê nome/e-mail via useUser() logo em seguida.
      await session.reload();
      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1C140D] text-[#FDF9F2] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[#FDF9F2]">SF Madeiras</h1>
          <p className="text-[#E3D9C6] text-sm">Crie sua conta</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-[#E3D9C6]">Nome completo</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full px-4 py-3 bg-[#2A1D14] border border-[#3D2B1D] rounded-xl text-[#FDF9F2] placeholder-[#E3D9C6]/40 focus:outline-none focus:border-[#E8A93A] transition-colors"
            />
          </div>
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
              type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[#2A1D14] border border-[#3D2B1D] rounded-xl text-[#FDF9F2] placeholder-[#E3D9C6]/40 focus:outline-none focus:border-[#E8A93A] transition-colors"
            />
            <p className="text-xs text-[#E3D9C6]/70">Mínimo de 8 caracteres.</p>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="w-full py-3.5 bg-[#E8A93A] hover:bg-[#dd9d2e] disabled:opacity-50 rounded-xl font-bold text-[#1C140D] transition-colors"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-[#E3D9C6]/70">
          Já tem conta? <Link href="/sign-in" className="text-[#E8A93A] hover:text-[#dd9d2e] underline">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
