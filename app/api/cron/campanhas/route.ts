import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent-engine";
import { sendWhatsAppTextAsTeam } from "@/lib/whatsapp";
import { sendCloudTemplate, type TemplateComponent } from "@/lib/whatsapp-cloud";
import { logTokenUsage, isOverQuota } from "@/lib/token-usage";

// Máximo de destinatários processados por execução do cron — o intervalo entre eles
// é o que protege contra bloqueio, não o tamanho do lote
const MAX_POR_EXECUCAO = 1;

const VARIACAO_PROMPT = `Você reescreve mensagens de disparo comercial em WhatsApp para variar o texto entre
destinatários, mantendo o MESMO significado e call-to-action, mas mudando palavras, ordem das frases e tom sutilmente
— isso evita que a mensagem pareça um disparo em massa idêntico. NÃO mude nenhuma informação factual (preços, links,
prazos, nomes de produtos). NÃO adicione emojis se o original não tiver. Responda APENAS com a mensagem reescrita,
sem aspas, sem comentários.`;

function randomDelaySeconds(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

// Disparado por scheduler externo a cada 1 minuto: Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campanhas = await prisma.campanha.findMany({
    where: { status: "ENVIANDO", nextSendAt: { lte: new Date() } },
    include: {
      agentConfig: {
        select: { uazapiToken: true, teamId: true, whatsappProvider: true, cloudApiPhoneNumberId: true, cloudApiAccessToken: true },
      },
    },
  });

  let processadas = 0;

  for (const campanha of campanhas) {
    const isCloudApi = campanha.agentConfig.whatsappProvider === "CLOUD_API";
    const isConnected = isCloudApi
      ? Boolean(campanha.agentConfig.cloudApiPhoneNumberId && campanha.agentConfig.cloudApiAccessToken)
      : Boolean(campanha.agentConfig.uazapiToken);

    if (!isConnected) {
      await prisma.campanha.update({ where: { id: campanha.id }, data: { status: "PAUSADA", nextSendAt: null } });
      continue;
    }

    const proximos = await prisma.campanhaDestinatario.findMany({
      where: { campanhaId: campanha.id, status: "PENDENTE" },
      orderBy: { createdAt: "asc" },
      take: MAX_POR_EXECUCAO,
    });

    if (proximos.length === 0) {
      await prisma.campanha.update({ where: { id: campanha.id }, data: { status: "CONCLUIDA", nextSendAt: null, finishedAt: new Date() } });
      continue;
    }

    const overQuota = campanha.modo === "IA_VARIACAO" ? await isOverQuota(campanha.agentConfig.teamId) : false;

    for (const dest of proximos) {
      const primeiroNome = (dest.contactName || "").trim().split(" ")[0] || "";

      try {
        if (campanha.origemMensagem === "TEMPLATE_META") {
          // Campanha via template aprovado da Meta — obrigatório na API oficial, texto livre não é permitido fora da janela de 24h
          const variaveis: string[] = campanha.templateVariaveis ? JSON.parse(campanha.templateVariaveis) : [];
          const resolved = variaveis.map(v => v === "{nome}" ? (primeiroNome || "cliente") : v);
          const components: TemplateComponent[] = resolved.length > 0
            ? [{ type: "body", parameters: resolved.map(text => ({ type: "text" as const, text })) }]
            : [];

          await sendCloudTemplate(
            campanha.agentConfig.cloudApiPhoneNumberId!,
            campanha.agentConfig.cloudApiAccessToken!,
            dest.contactNumber,
            campanha.templateName!,
            campanha.templateLanguage ?? "pt_BR",
            components
          );
          await prisma.campanhaDestinatario.update({
            where: { id: dest.id },
            data: { status: "ENVIADO", mensagemEnviada: `[template: ${campanha.templateName}]`, sentAt: new Date() },
          });
        } else {
          let texto = campanha.mensagem.replaceAll("{nome}", primeiroNome);

          if (campanha.modo === "IA_VARIACAO" && !overQuota) {
            const instrucao = campanha.instrucoesIA ? `\n\nOrientações adicionais: ${campanha.instrucoesIA}` : "";
            const result = await runAgent(
              VARIACAO_PROMPT + instrucao,
              [],
              `Mensagem original (destinatário: ${primeiroNome || "cliente"}):\n${texto}`
            );
            texto = result.reply.trim() || texto;
            logTokenUsage({ teamId: campanha.agentConfig.teamId, provider: "openai", model: "gpt-4o-mini", feature: "campanha_variacao", ...result.usage });
          }

          await sendWhatsAppTextAsTeam(campanha.agentConfig.uazapiToken!, dest.contactNumber, texto);
          await prisma.campanhaDestinatario.update({
            where: { id: dest.id },
            data: { status: "ENVIADO", mensagemEnviada: texto, sentAt: new Date() },
          });
        }
      } catch (err: any) {
        console.error("[campanha] erro ao enviar:", err?.message ?? err);
        await prisma.campanhaDestinatario.update({ where: { id: dest.id }, data: { status: "ERRO" } });
      }

      processadas++;
    }

    const restantes = await prisma.campanhaDestinatario.count({ where: { campanhaId: campanha.id, status: "PENDENTE" } });
    if (restantes === 0) {
      await prisma.campanha.update({ where: { id: campanha.id }, data: { status: "CONCLUIDA", nextSendAt: null, finishedAt: new Date() } });
    } else {
      const delay = randomDelaySeconds(campanha.intervaloMinSeg, campanha.intervaloMaxSeg);
      await prisma.campanha.update({ where: { id: campanha.id }, data: { nextSendAt: new Date(Date.now() + delay * 1000) } });
    }
  }

  return NextResponse.json({ ok: true, campanhasAtivas: campanhas.length, enviosProcessados: processadas });
}
