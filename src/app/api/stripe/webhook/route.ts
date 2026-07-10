import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Le SDK Stripe a besoin du module crypto Node pour vérifier la signature —
// jamais edge (même raison que /api/scan pour la clé Anthropic).
export const runtime = "nodejs";

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

// current_period_end vit désormais sur chaque SubscriptionItem (pas sur
// l'abonnement lui-même) dans les versions récentes de l'API Stripe.
function periodEndOf(subscription: Stripe.Subscription): Date | null {
  const unix = subscription.items.data[0]?.current_period_end;
  return unix ? new Date(unix * 1000) : null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: isActive ? "PREMIUM" : "FREE",
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEndOf(subscription),
    },
  });
}

export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Corps brut obligatoire pour la vérification HMAC — jamais request.json().
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe webhook] signature invalide", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // Premier événement du cycle : stripeCustomerId n'est pas forcément
    // encore enregistré côté base au moment où cet événement arrive, donc
    // on retrouve l'utilisateur via client_reference_id (posé explicitement
    // à la création de la session dans billing.ts), pas via le customer.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = customerIdOf(session.customer);

      if (userId && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "PREMIUM",
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: periodEndOf(subscription),
          },
        });
      }
      break;
    }

    // Événements de cycle de vie ultérieurs : stripeCustomerId est déjà
    // enregistré depuis checkout.session.completed, on l'utilise pour
    // retrouver l'utilisateur.
    case "customer.subscription.updated": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = customerIdOf(subscription.customer);
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: "FREE",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            subscriptionCurrentPeriodEnd: null,
          },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
