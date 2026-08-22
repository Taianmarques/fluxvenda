"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Step = "form" | "code";

export function SignUpForm({ redirectUrl }: { redirectUrl: string }) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o código.");
        setSaving(false);
        return;
      }
      setStep("code");
      setSaving(false);
    } catch {
      setError("Não foi possível enviar o código. Tente novamente.");
      setSaving(false);
    }
  }

  async function resendCode() {
    setSaving(true);
    setError("");
    setResendMessage("");
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível reenviar o código.");
      } else {
        setResendMessage("Código reenviado.");
      }
    } catch {
      setError("Não foi possível reenviar o código.");
    }
    setSaving(false);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/auth/cadastro/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Código inválido.");
        setSaving(false);
        return;
      }
      window.location.href = redirectUrl;
    } catch {
      setError("Não foi possível confirmar o código. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Image src="/logoflux.png" alt="FluxVenda" width={200} height={50} className="mx-auto" priority />
          <p className="text-gray-400 text-sm">Comece a usar a FluxVenda</p>
        </div>

        {step === "form" ? (
          <form onSubmit={sendCode} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
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
              <label className="text-sm font-medium text-gray-300">WhatsApp</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-gray-500">Vamos mandar um código de verificação por lá.</p>
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
              {saving ? "Enviando código..." : "Continuar"}
            </button>

            <p className="text-sm text-center text-gray-400">
              Já tem conta?{" "}
              <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">
                Entrar
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-300">
                Mandamos um código de 6 dígitos pro WhatsApp <span className="font-medium text-white">{phone}</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Código de verificação</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {resendMessage && <p className="text-green-400 text-sm">{resendMessage}</p>}

            <button
              type="submit"
              disabled={saving || code.length !== 6}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
            >
              {saving ? "Confirmando..." : "Confirmar código"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setResendMessage(""); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={resendCode}
                disabled={saving}
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
