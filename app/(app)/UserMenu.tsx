"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

// Substitui o <UserButton> do Clerk: avatar simples + menu com "Sair".
// openDirection "up" (padrão) é pra quando o botão fica perto do rodapé da tela (sidebar);
// "down" é pra quando fica no topo (barra mobile), senão o menu abriria cortado pra fora da tela.
export function UserMenu({ name, openDirection = "up", align = "start" }: { name: string; openDirection?: "up" | "down"; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0"
        aria-label="Menu do usuário"
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute w-40 bg-gray-900 border border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden ${
            openDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "start" ? "left-0" : "right-0"}`}>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
