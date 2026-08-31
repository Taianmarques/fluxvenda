import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { dentroHorarioEnvio } from "@/lib/sending-hours";

// Prospecção é abordagem fria a desconhecidos — as faixas são mais espaçadas que as de
// Campanha (que manda pra base própria) porque o risco de denúncia/banimento é maior aqui.
// Mesmas 3 chaves que a tela de Campanhas usa, pra manter o vocabulário consistente no CRM.
const RITMOS: Record<string, { min: number; max: number }> = {
  seguro: { min: 120, max: 300 },
  moderado: { min: 60, max: 150 },
  rapido: { min: 30, max: 90 },
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function randomDelaySeconds(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

// Cron de prospecção ativa: envia a 1ª mensagem aos prospects NOVO e
// follow-ups automáticos aos que não responderam (ABORDADO).
// Disparado externamente com: Authorization: Bearer <CRON_SECRET>
//
// Processa no máximo 1 abordagem/follow-up POR AGENTE a cada execução, e só volta a mandar
// pra esse agente depois de um intervalo aleatório (prospeccaoNextSendAt) — sem isso, importar
// uma planilha de centenas de leads e ativar a prospecção disparava todas as mensagens de uma
// vez, na velocidade do fetch, o cenário clássico de banimento do número.
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

    // Follow-up esgotado é só uma troca de status (nenhuma mensagem sai) — roda sempre, sem
    // entrar no throttle abaixo, que existe só pra limitar mensagens de fato enviadas.
    const abordados = await prisma.prospect.findMany({
      where: { agentConfigId: config.id, status: "ABORDADO" },
    });
    const pendentesFollowup: typeof abordados = [];
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
      pendentesFollowup.push(p);
    }

    const podeEnviarAgora = !config.prospeccaoNextSendAt || config.prospeccaoNextSendAt <= new Date();
    if (!podeEnviarAgora) continue;
    if (!dentroHorarioEnvio(config.horarioEnvioInicio, config.horarioEnvioFim)) continue;

    // Prioriza a 1ª abordagem de quem é NOVO (fila mais antiga primeiro); só passa pro
    // follow-up se não houver ninguém novo esperando.
    const novo = await prisma.prospect.findFirst({
      where: { agentConfigId: config.id, status: "NOVO" },
      orderBy: { createdAt: "asc" },
    });

    let enviouAgora = false;

    if (novo) {
      try {
        const msg = mensagemInicial
          .replaceAll("{nome}", novo.nome)
          .replaceAll("{empresa}", novo.empresa || novo.nome)
          .replaceAll("{segmento}", novo.segmento);
        const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken!, novo.telefone, msg);
        // sendWhatsAppTextAsTeam não lança em erro de API — sem checar o retorno, o prospect
        // seria marcado ABORDADO mesmo quando a 1ª mensagem nunca chegou a sair.
        if (!sentId) throw new Error("Instância de WhatsApp não confirmou o envio");
        await prisma.prospect.update({
          where: { id: novo.id },
          data: { status: "ABORDADO", abordagemCount: 1, lastAbordagemAt: new Date() },
        });
        enviados++;
        enviouAgora = true;
      } catch (err) {
        console.error(`[cron/prospeccao] erro ao abordar ${novo.telefone}:`, err);
      }
    } else if (pendentesFollowup.length > 0) {
      const p = pendentesFollowup[0];
      try {
        const followupMsg = `Olá ${p.nome}! Passando para reforçar o contato sobre ${p.segmento}. Posso tirar alguma dúvida?`;
        const sentId = await sendWhatsAppTextAsTeam(config.uazapiToken!, p.telefone, followupMsg);
        if (!sentId) throw new Error("Instância de WhatsApp não confirmou o envio");
        await prisma.prospect.update({
          where: { id: p.id },
          data: { abordagemCount: { increment: 1 }, lastAbordagemAt: new Date() },
        });
        enviados++;
        enviouAgora = true;
      } catch (err) {
        console.error(`[cron/prospeccao] erro no follow-up de ${p.telefone}:`, err);
      }
    }

    // Só escalona o próximo envio se de fato enviou — se falhou (catch acima), deixa
    // prospeccaoNextSendAt como está pra tentar de novo já na próxima execução do cron.
    if (enviouAgora) {
      const ritmo = RITMOS[config.prospeccaoRitmo] ?? RITMOS.seguro;
      const delay = randomDelaySeconds(ritmo.min, ritmo.max);
      await prisma.agentConfig.update({
        where: { id: config.id },
        data: { prospeccaoNextSendAt: new Date(Date.now() + delay * 1000) },
      });
    }
  }

  return NextResponse.json({ configs: configs.length, enviados, encerrados });
}
