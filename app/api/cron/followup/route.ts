import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFollowupMessage } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

// Disparado por um scheduler externo (crontab/cron-job.org) com:
// Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.agentConfig.findMany({
    where: { active: true, followupEnabled: true, uazapiToken: { not: null } },
  });

  let sent = 0;
  let checked = 0;

  for (const config of configs) {
    const candidates = await prisma.conversation.findMany({
      where: {
        agentConfigId: config.id,
        humanTakeover: false,
        status: { not: "FINALIZADO" },
        followupCount: { lt: config.followupMaxAttempts },
        updatedAt: { lte: hoursAgo(config.followupDelayHours) },
      },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 20 } },
    });

    for (const conversation of candidates) {
      checked++;
      const lastMessage = conversation.messages[0];
      // Só faz follow-up se a última mensagem foi nossa (estamos esperando o cliente responder)
      if (!lastMessage || lastMessage.role === "user") continue;
      if (!config.systemPrompt || !config.uazapiToken) continue;

      const history = conversation.messages
        .slice()
        .reverse()
        .map(m => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.content }));

      const followup = await generateFollowupMessage(config.systemPrompt, history, conversation.followupCount + 1);
      if (!followup) continue;

      await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: followup } });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { followupCount: { increment: 1 }, lastFollowupAt: new Date() },
      });
      await sendWhatsAppTextAsTeam(config.uazapiToken, conversation.contactNumber, followup);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, checked, sent });
}
