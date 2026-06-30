import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { randomUUID } from "crypto";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  return NextResponse.json({
    commerceEnabled: config.commerceEnabled,
    catalogOnly: config.catalogOnly,
    asaasSandbox: config.asaasSandbox,
    hasAsaasApiKey: Boolean(config.asaasApiKey),
    asaasWebhookToken: config.asaasWebhookToken,
    webhookPath: `/api/webhooks/asaas/${agentId}`,
    installmentsEnabled: config.installmentsEnabled,
    maxInstallments: config.maxInstallments,
    interestFreeInstallments: config.interestFreeInstallments,
    installmentInterestRate: config.installmentInterestRate,
  });
}

const schema = z.object({
  commerceEnabled: z.boolean().optional(),
  catalogOnly: z.boolean().optional(),
  asaasApiKey: z.string().min(1).optional(),
  asaasSandbox: z.boolean().optional(),
  installmentsEnabled: z.boolean().optional(),
  maxInstallments: z.number().int().min(1).max(21).optional(),
  interestFreeInstallments: z.number().int().min(0).max(21).optional(),
  installmentInterestRate: z.number().min(0).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // Gera o token de validação do webhook na primeira vez que o comércio é ativado
  const needsWebhookToken = body.data.commerceEnabled && !config.asaasWebhookToken;

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: { ...body.data, ...(needsWebhookToken ? { asaasWebhookToken: randomUUID() } : {}) },
  });

  return NextResponse.json({
    commerceEnabled: updated.commerceEnabled,
    asaasSandbox: updated.asaasSandbox,
    hasAsaasApiKey: Boolean(updated.asaasApiKey),
    asaasWebhookToken: updated.asaasWebhookToken,
    webhookPath: `/api/webhooks/asaas/${agentId}`,
    installmentsEnabled: updated.installmentsEnabled,
    maxInstallments: updated.maxInstallments,
    interestFreeInstallments: updated.interestFreeInstallments,
    installmentInterestRate: updated.installmentInterestRate,
  });
}
