import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Cron de prospecção ativa: envia a 1ª mensagem aos prospects NOVO e
// follow-ups automáticos aos que não responderam (ABORDADO).
// Disparado externamente com: Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.agentConfig.findMany({
    where: { active: true, prospeccaoEnabled: true, uazapiToken: { not: null } },
  });

  let enviados = 0;
  let encerrados = 0;

  for (const config of configs) {
    const followupDias = (config.prospeccaoFollowupDias as number[]) ?? [3, 7, 14];
    const mensagemInicial = config.prospeccaoMensagemInicial?.trim() || null;

    if (!mensagemInicial) continue; // sem mensagem configurada, não aborda ninguém

    // 1. Prospects NOVO — envia a 1ª abordagem
    const novos = await prisma.prospect.findMany({
      where: { agentConfigId: config.id, status: "NOVO" },
    });

    for (const p of novos) {
      try {
        const msg = mensagemInicial
          .replace("{nome}", p.nome)
          .replace("{empresa}", p.empresa || p.nome)
          .replace("{segmento}", p.segmento);
        await sendWhatsAppTextAsTeam(config.uazapiToken!, p.telefone, msg);
        await prisma.prospect.update({
          where: { id: p.id },
          data: { status: "ABORDADO", abordagemCount: 1, lastAbordagemAt: new Date() },
        });
        enviados++;
      } catch (err) {
        console.error(`[cron/prospeccao] erro ao abordar ${p.telefone}:`, err);
      }
    }

    // 2. Prospects ABORDADO — follow-up se passou o prazo
    const abordados = await prisma.prospect.findMany({
      where: { agentConfigId: config.id, status: "ABORDADO" },
    });

    for (const p of abordados) {
      if (!p.lastAbordagemAt) continue;
      const diasEsperados = followupDias[p.abordagemCount - 1]; // índice baseado em quantas já foram enviadas
      if (diasEsperados === undefined) {
        // Esgotou todos os follow-ups
        await prisma.prospect.update({ where: { id: p.id }, data: { status: "ENCERRADO" } });
        encerrados++;
        continue;
      }
      if (daysSince(p.lastAbordagemAt) < diasEsperados) continue;

      try {
        const followupMsg = `Olá ${p.nome}! Passando para reforçar o contato sobre ${p.segmento}. Posso tirar alguma dúvida?`;
        await sendWhatsAppTextAsTeam(config.uazapiToken!, p.telefone, followupMsg);
        await prisma.prospect.update({
          where: { id: p.id },
          data: { abordagemCount: { increment: 1 }, lastAbordagemAt: new Date() },
        });
        enviados++;
      } catch (err) {
        console.error(`[cron/prospeccao] erro no follow-up de ${p.telefone}:`, err);
      }
    }
  }

  return NextResponse.json({ configs: configs.length, enviados, encerrados });
}
