"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useClerk } from "@/lib/auth-client";

// Substitui o <UserButton afterSignOutUrl="/"> do Clerk — versão mínima, só o essencial.
export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut(() => router.push("/"));
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      title="Sair"
      className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
    >
      <LogOut size={14} />
    </button>
  );
}
