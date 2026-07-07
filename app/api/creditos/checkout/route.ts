import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCreditPack } from "@/lib/credits";
import { z } from "zod";

const schema = z.object({ packId: z.string().min(1) });

// Só o gestor (dono da equipe) compra créditos — mesmo padrão de getOwnTeam usado em /api/agentes
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { managerId: userId } });
  if (!team) return NextResponse.json({ error: "Só o gestor da equipe compra créditos" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const pack = getCreditPack(body.data.packId);
  if (!pack) return NextResponse.json({ error: "Pacote inválido" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `${pack.tokens.toLocaleString("pt-BR")} créditos de IA — ${pack.label}`,
            description: "Créditos extras de IA para a plataforma FluxVenda (não expiram).",
          },
          unit_amount: pack.valorCentavos,
        },
        quantity: 1,
      },
    ],
    metadata: { kind: "ai_credits", teamId: team.id, packId: pack.id, tokens: String(pack.tokens) },
    success_url: `${appUrl}/creditos?compra=sucesso`,
    cancel_url: `${appUrl}/creditos?compra=cancelada`,
  });

  await prisma.creditoCompra.create({
    data: {
      teamId: team.id,
      packId: pack.id,
      tokens: pack.tokens,
      valorCentavos: pack.valorCentavos,
      stripeSessionId: session.id,
      status: "PENDENTE",
    },
  });

  return NextResponse.json({ url: session.url });
}
