import { EventEmitter } from "events";

// Barramento de eventos em memória para push em tempo real (SSE) no chat.
// Funciona porque o app roda em UM processo (PM2 fork) — se um dia escalar para
// cluster/múltiplas instâncias, trocar por Redis pub/sub.
type ChatEvent = { conversationId: string; at: number };

function getEmitter(): EventEmitter {
  const g = globalThis as any;
  if (!g.__realtimeEmitter) {
    g.__realtimeEmitter = new EventEmitter();
    g.__realtimeEmitter.setMaxListeners(500); // um listener por aba de CRM aberta
  }
  return g.__realtimeEmitter;
}

// Chamado pelos webhooks/rotas sempre que uma mensagem entra ou sai de uma conversa
export function emitChatEvent(agentConfigId: string, conversationId: string): void {
  try {
    getEmitter().emit(`agent:${agentConfigId}`, { conversationId, at: Date.now() } satisfies ChatEvent);
  } catch {}
}

export function subscribeChatEvents(agentConfigId: string, listener: (e: ChatEvent) => void): () => void {
  const emitter = getEmitter();
  const channel = `agent:${agentConfigId}`;
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
}
