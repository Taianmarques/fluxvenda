import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const PLAN_MAP: Record<string, "FREE" | "PRO" | "TEAM"> = {
  price_pro: "PRO",
  price_team: "TEAM",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Signature inválida" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Compra de créditos de IA (pagamento único) — distingue da assinatura de plano pelo metadata
      if (session.metadata?.kind === "ai_credits") {
        const compra = await prisma.creditoCompra.findUnique({ where: { stripeSessionId: session.id } });
        if (compra && compra.status !== "PAGO") {
          await prisma.$transaction([
            prisma.creditoCompra.update({ where: { id: compra.id }, data: { status: "PAGO" } }),
            prisma.team.update({ where: { id: compra.teamId }, data: { aiCreditsBalance: { increment: compra.tokens } } }),
          ]);
        }
        break;
      }

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const priceId = session.metadata?.priceId ?? "";
      const plan = PLAN_MAP[priceId] ?? "PRO";

      await prisma.profile.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan, stripeSubscriptionId: subscriptionId },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.profile.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "FREE", stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
