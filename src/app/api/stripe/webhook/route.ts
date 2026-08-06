import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_SCAN_CREDIT,
  INITIAL_SCAN_CREDIT_DURATION_DAYS,
} from "@/lib/scan/monthly-quota";

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

function planForSubscription(subscription: Stripe.Subscription) {
  if (!isSubscriptionActive(subscription)) return "FREE" as const;
  return subscription.metadata.betaOfferApplied === "true"
    ? ("BETA_PREMIUM" as const)
    : ("PREMIUM" as const);
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: planForSubscription(subscription),
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEndOf(subscription),
    },
  });
}

function isSubscriptionActive(subscription: Stripe.Subscription): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
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

        const isActive = isSubscriptionActive(subscription);
        const betaOfferApplied = session.metadata?.betaOfferApplied === "true";

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: isActive
              ? betaOfferApplied
                ? "BETA_PREMIUM"
                : "PREMIUM"
              : "FREE",
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: periodEndOf(subscription),
          },
        });

        // Crédit accordé une seule fois pour permettre l'import de l'historique.
        // updateMany conditionnel garde le webhook idempotent : Stripe peut livrer
        // plusieurs fois checkout.session.completed sans recréer les 300 crédits.
        if (isActive) {
          const grantedAt = new Date();
          const expiresAt = new Date(
            grantedAt.getTime() + INITIAL_SCAN_CREDIT_DURATION_DAYS * 24 * 60 * 60 * 1000
          );
          await prisma.user.updateMany({
            where: { id: userId, initialScanCreditGrantedAt: null },
            data: {
              initialScanCreditRemaining: INITIAL_SCAN_CREDIT,
              initialScanCreditGrantedAt: grantedAt,
              initialScanCreditExpiresAt: expiresAt,
            },
          });
        }

        // Cette valeur vient de métadonnées écrites côté serveur au moment de
        // créer Checkout. Elle empêche de reprendre la remise après
        // résiliation, même si le client tente de relancer un achat.
        if (betaOfferApplied && isActive) {
          await prisma.user.updateMany({
            where: { id: userId, betaOfferUsedAt: null },
            data: { betaOfferUsedAt: new Date() },
          });
        }
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

    // Les factures des abonnements sont créées et encaissées par Stripe
    // Billing. Ces événements rendent la synchronisation résiliente si
    // l'ordre de livraison diffère de celui des événements subscription.*.
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      if (invoiceSubscription) {
        const subscriptionId =
          typeof invoiceSubscription === "string"
            ? invoiceSubscription
            : invoiceSubscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(subscription);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
