import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userBelongsToAgentConfig } from "@/lib/team";
import { subscribeChatEvents } from "@/lib/realtime";

export const dynamic = "force-dynamic";

// Stream SSE: avisa o CRM na hora que chega/sai mensagem em qualquer conversa do agente.
// O cliente reage buscando a lista/conversa — o polling continua como fallback.
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch {}
      };

      send(`retry: 3000\n\n`);

      const unsubscribe = subscribeChatEvents(agentId, (e) => {
        send(`data: ${JSON.stringify(e)}\n\n`);
      });

      // Heartbeat mantém o proxy/navegador com a conexão aberta
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // desativa buffering em proxies (nginx/Easypanel)
    },
  });
}
