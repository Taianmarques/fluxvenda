import { prisma } from "@/lib/prisma";
import { sendInstagramDM } from "@/lib/instagram";

type Branch = { keywords: string[]; label: string; funnelId: string | null };

// Inicia a execução de um funil para um contato.
// Se já houver execução ativa, cancela a anterior antes de criar nova.
export async function startFunnelExecution({
  funnelId,
  agentConfigId,
  contactIgsid,
  igBusinessAccountId,
  pageAccessToken,
}: {
  funnelId: string;
  agentConfigId: string;
  contactIgsid: string;
  igBusinessAccountId: string;
  pageAccessToken: string;
}) {
  const funnel = await prisma.instagramFunnel.findUnique({
    where: { id: funnelId },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!funnel || !funnel.active || funnel.blocks.length === 0) return;

  // Cancela execuções anteriores ativas do mesmo contato nesse agente
  await prisma.instagramFunnelExecution.updateMany({
    where: {
      agentConfigId,
      contactIgsid,
      status: { in: ["RUNNING", "WAITING_DELAY", "WAITING_INPUT"] },
    },
    data: { status: "COMPLETED" },
  });

  const execution = await prisma.instagramFunnelExecution.create({
    data: {
      funnelId,
      agentConfigId,
      contactIgsid,
      igBusinessAccountId,
      pageAccessToken,
      blockIndex: 0,
      status: "RUNNING",
    },
  });

  await runExecution(execution.id, funnel.blocks);
}

// Avança a execução a partir do bloco atual, processando MESSAGE e DELAY em sequência.
// Para quando encontra DELAY (agenda) ou CONDITION (aguarda input).
export async function runExecution(executionId: string, preloadedBlocks?: any[]) {
  const execution = await prisma.instagramFunnelExecution.findUnique({
    where: { id: executionId },
  });
  if (!execution || execution.status === "COMPLETED") return;

  const blocks = preloadedBlocks ?? await prisma.instagramFunnelBlock.findMany({
    where: { funnelId: execution.funnelId },
    orderBy: { order: "asc" },
  });

  let idx = execution.blockIndex;

  while (idx < blocks.length) {
    const block = blocks[idx];

    if (block.type === "MESSAGE") {
      if (block.content) {
        await sendInstagramDM(
          execution.igBusinessAccountId,
          execution.pageAccessToken,
          execution.contactIgsid,
          block.content
        );
      }
      idx++;
      await prisma.instagramFunnelExecution.update({
        where: { id: executionId },
        data: { blockIndex: idx, updatedAt: new Date() },
      });
      continue;
    }

    if (block.type === "DELAY") {
      const minutes = block.delayMinutes ?? 1;
      await prisma.instagramFunnelExecution.update({
        where: { id: executionId },
        data: {
          blockIndex: idx + 1,
          status: "WAITING_DELAY",
          resumeAt: new Date(Date.now() + minutes * 60_000),
          updatedAt: new Date(),
        },
      });
      return; // para aqui — o cron retoma depois
    }

    if (block.type === "CONDITION") {
      // Envia a pergunta e aguarda resposta do usuário
      if (block.content) {
        await sendInstagramDM(
          execution.igBusinessAccountId,
          execution.pageAccessToken,
          execution.contactIgsid,
          block.content
        );
      }
      await prisma.instagramFunnelExecution.update({
        where: { id: executionId },
        data: { blockIndex: idx, status: "WAITING_INPUT", updatedAt: new Date() },
      });
      return; // aguarda reply
    }

    idx++; // bloco desconhecido — pula
  }

  // Todos os blocos processados
  await prisma.instagramFunnelExecution.update({
    where: { id: executionId },
    data: { status: "COMPLETED", updatedAt: new Date() },
  });
}

// Chamado quando o contato envia uma DM enquanto há uma execução WAITING_INPUT.
// Retorna true se o reply foi tratado pelo funil (não deve passar para a IA).
export async function handleFunnelReply({
  agentConfigId,
  contactIgsid,
  text,
  igBusinessAccountId,
  pageAccessToken,
}: {
  agentConfigId: string;
  contactIgsid: string;
  text: string;
  igBusinessAccountId: string;
  pageAccessToken: string;
}): Promise<boolean> {
  const execution = await prisma.instagramFunnelExecution.findFirst({
    where: { agentConfigId, contactIgsid, status: "WAITING_INPUT" },
    orderBy: { createdAt: "desc" },
  });
  if (!execution) return false;

  const block = await prisma.instagramFunnelBlock.findFirst({
    where: { funnelId: execution.funnelId, order: execution.blockIndex },
  });
  if (!block || block.type !== "CONDITION") return false;

  const branches: Branch[] = Array.isArray(block.branches) ? block.branches as Branch[] : [];
  const lower = text.toLowerCase();

  let matchedFunnelId: string | null | undefined = undefined;
  for (const branch of branches) {
    if (branch.keywords.length === 0) { matchedFunnelId = branch.funnelId; break; }
    const hit = branch.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    if (hit) { matchedFunnelId = branch.funnelId; break; }
  }

  if (matchedFunnelId === undefined) {
    // Nenhum branch bateu — avança para o próximo bloco no funil atual
    await prisma.instagramFunnelExecution.update({
      where: { id: execution.id },
      data: { blockIndex: execution.blockIndex + 1, status: "RUNNING", updatedAt: new Date() },
    });
    await runExecution(execution.id);
    return true;
  }

  // Fecha execução atual
  await prisma.instagramFunnelExecution.update({
    where: { id: execution.id },
    data: { status: "COMPLETED", updatedAt: new Date() },
  });

  if (matchedFunnelId) {
    // Inicia o funil da branch
    await startFunnelExecution({
      funnelId: matchedFunnelId,
      agentConfigId,
      contactIgsid,
      igBusinessAccountId,
      pageAccessToken,
    });
  }
  // matchedFunnelId === null → branch encerra sem próximo funil

  return true;
}

// Processa execuções WAITING_DELAY cujo resumeAt já passou.
// Chamado pelo cron /api/cron/instagram-funnels.
export async function processDelayedExecutions() {
  const due = await prisma.instagramFunnelExecution.findMany({
    where: { status: "WAITING_DELAY", resumeAt: { lte: new Date() } },
    take: 50,
  });

  for (const exec of due) {
    await prisma.instagramFunnelExecution.update({
      where: { id: exec.id },
      data: { status: "RUNNING", updatedAt: new Date() },
    });
    await runExecution(exec.id).catch((err) =>
      console.error("[funnel-runner] processDelayedExecutions:", err)
    );
  }

  return due.length;
}
