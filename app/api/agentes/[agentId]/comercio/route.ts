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
    orderWebhookUrl: config.orderWebhookUrl,
    hasOrderWebhookSecret: Boolean(config.orderWebhookSecret),
    deliveryEnabled: config.deliveryEnabled,
    pickupEnabled: config.pickupEnabled,
    deliveryFee: config.deliveryFee,
    deliveryFreeAbove: config.deliveryFreeAbove,
    deliveryArea: config.deliveryArea,
    deliveryZones: await prisma.deliveryZone.findMany({
      where: { agentConfigId: config.id },
      orderBy: { order: "asc" },
      select: { name: true, fee: true },
    }),
  });
}

const schema = z.object({
  commerceEnabled: z.boolean().optional(),
  catalogOnly: z.boolean().optional(),
  cobrancaEnabled: z.boolean().optional(),
  asaasApiKey: z.string().min(1).optional(),
  asaasSandbox: z.boolean().optional(),
  installmentsEnabled: z.boolean().optional(),
  maxInstallments: z.number().int().min(1).max(21).optional(),
  interestFreeInstallments: z.number().int().min(0).max(21).optional(),
  installmentInterestRate: z.number().min(0).max(100).optional(),
  // Logo do catálogo público — null remove a logo
  storeLogoBase64: z.string().max(3_000_000).nullable().optional(),
  storeLogoMimeType: z.string().nullable().optional(),
  // Integração com o sistema do cliente — null desativa
  orderWebhookUrl: z.string().url().max(500).nullable().optional(),
  orderWebhookSecret: z.string().max(200).nullable().optional(),
  // Entrega
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryFee: z.number().min(0).max(100000).optional(),
  deliveryFreeAbove: z.number().min(0).max(1000000).nullable().optional(),
  deliveryArea: z.string().max(1000).optional(),
  // Zonas com taxa própria — substitui a lista inteira quando presente
  deliveryZones: z.array(z.object({
    name: z.string().min(1).max(100),
    fee: z.number().min(0).max(100000),
  })).max(50).optional(),
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

  const { deliveryZones, ...configData } = body.data;

  const updated = await prisma.agentConfig.update({
    where: { id: config.id },
    data: { ...configData, ...(needsWebhookToken ? { asaasWebhookToken: randomUUID() } : {}) },
  });

  if (deliveryZones) {
    await prisma.$transaction([
      prisma.deliveryZone.deleteMany({ where: { agentConfigId: config.id } }),
      prisma.deliveryZone.createMany({
        data: deliveryZones.map((z, i) => ({ agentConfigId: config.id, name: z.name.trim(), fee: z.fee, order: i })),
      }),
    ]);
  }

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
