"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
          <p className="text-gray-400 text-sm">Informe seu e-mail pra receber o link de redefinição</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          {sent ? (
            <p className="text-sm text-gray-300">
              Se esse e-mail estiver cadastrado, você vai receber um link em instantes. Confira também o spam.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
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
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
              >
                {saving ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-gray-400">
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 transition-colors">
              Voltar pro login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
