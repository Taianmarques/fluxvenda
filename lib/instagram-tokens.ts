import { prisma } from "@/lib/prisma";
import { renovarTokenInstagram } from "@/lib/instagram";

// O token do Instagram dura 60 dias e, depois de vencido, só volta reconectando a conta.
// Roda junto do cron de follow-up (a cada 5 min), mas só confere uma vez por hora.
const JANELA_RENOVACAO_MS = 20 * 24 * 60 * 60 * 1000;
const INTERVALO_VERIFICACAO_MS = 60 * 60 * 1000;
let ultimaVerificacao = 0;

export async function renovarTokensInstagramVencendo() {
  if (Date.now() - ultimaVerificacao < INTERVALO_VERIFICACAO_MS) return;
  ultimaVerificacao = Date.now();

  const agora = new Date();
  const conexoes = await prisma.instagramConnection.findMany({
    where: { tokenExpiresAt: { gt: agora, lt: new Date(agora.getTime() + JANELA_RENOVACAO_MS) } },
    select: { id: true, instagramUsername: true, instagramBusinessAccountId: true, pageAccessToken: true },
    take: 100,
  });

  for (const c of conexoes) {
    try {
      const { token, expiresAt } = await renovarTokenInstagram(c.pageAccessToken);
      await prisma.instagramConnection.update({ where: { id: c.id }, data: { pageAccessToken: token, tokenExpiresAt: expiresAt } });
      // Execuções em andamento guardam uma cópia do token
      await prisma.instagramFunnelExecution.updateMany({
        where: { igBusinessAccountId: c.instagramBusinessAccountId, status: { in: ["RUNNING", "WAITING_DELAY", "WAITING_INPUT"] } },
        data: { pageAccessToken: token },
      });
      console.log("[instagram-token] renovado:", c.instagramUsername);
    } catch (err) {
      console.error("[instagram-token] falha ao renovar:", c.instagramUsername, err instanceof Error ? err.message : "erro desconhecido");
    }
  }
}
