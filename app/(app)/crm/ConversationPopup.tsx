"use client";

import { ConversationThread } from "./ConversationThread";

// Casca de modal em volta de ConversationThread — usado como popup rápido de conversa (ex:
// pelo balão de chat do card do Kanban). A aba "Conversa" do modal de detalhes da
// oportunidade usa ConversationThread direto, sem essa casca (pra não empilhar dois modais).
export function ConversationPopup({ conversationId, onClose, dark }: { conversationId: string; onClose: () => void; dark: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg h-[600px] rounded-2xl border flex flex-col overflow-hidden ${dark ? "bg-gray-950 border-gray-800 text-white" : "bg-white border-gray-200 text-slate-900"}`}
      >
        <ConversationThread conversationId={conversationId} dark={dark} onClose={onClose} />
      </div>
    </div>
  );
}
