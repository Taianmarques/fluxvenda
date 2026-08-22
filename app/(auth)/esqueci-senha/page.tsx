"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLogo } from "@/app/AuthLogo";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/auth/esqueci-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSaving(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <AuthLogo />
          <p className="text-lg font-bold text-gray-900 pt-2">Esqueci minha senha</p>
          <p className="text-gray-500 text-sm">Informe seu e-mail pra receber o link de redefinição</p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-4">
          {sent ? (
            <p className="text-sm text-gray-600">
              Se esse e-mail estiver cadastrado, você vai receber um link em instantes. Confira também o spam.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
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
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold text-white transition-colors"
              >
                {saving ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-gray-500">
            <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 transition-colors">
              Voltar pro login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
