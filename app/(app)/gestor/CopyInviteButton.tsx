"use client";

import { useState } from "react";

export function CopyInviteButton({ inviteLink, inviteCode }: { inviteLink: string; inviteCode: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  function copy(text: string, type: "link" | "code") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      <button onClick={() => copy(inviteCode, "code")}
        className="px-3 py-2 text-xs border border-gray-600 hover:border-gray-400 rounded-xl transition-colors whitespace-nowrap">
        {copied === "code" ? "✓ Copiado!" : "Copiar código"}
      </button>
      <button onClick={() => copy(inviteLink, "link")}
        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors whitespace-nowrap">
        {copied === "link" ? "✓ Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
