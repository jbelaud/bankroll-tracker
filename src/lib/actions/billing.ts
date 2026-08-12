"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";
import { BILLING_UI_ENABLED } from "@/lib/billing/plans";

// Checkout/Portail Stripe entièrement côté serveur : pas de Stripe.js côté
// navigateur, le client se contente d'appeler l'action et de laisser la
// redirection se produire (redirect() de next/navigation, pas celui i18n —
// la destination est un domaine externe, hors du routing interne de l'app).

export type BillingActionResult = { error: string } | undefined;

function isMissingStripeCustomer(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  // Selon le runtime, le SDK peut sérialiser l'erreur Stripe en Error
  // générique tout en conservant les détails dans `raw`.
  const stripeError = error as {
    code?: unknown;
    param?: unknown;
    raw?: { code?: unknown; param?: unknown };
  };
  const code = stripeError.code ?? stripeError.raw?.code;
  const param = stripeError.param ?? stripeError.raw?.param;

  return code === "resource_missing" && param === "customer";
}

async function getOrCreateStripeCustomer({
  stripeClient,
  userId,
  email,
  existingCustomerId,
}: {
  stripeClient: Stripe;
  userId: string;
  email: string | undefined;
  existingCustomerId: string | null;
}): Promise<string> {
  if (existingCustomerId) {
    try {
      const customer = await stripeClient.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return customer.id;
    } catch (error) {
      if (!isMissingStripeCustomer(error)) throw error;
    }
  }

  const customer = await stripeClient.customers.create({
    email,
    metadata: { userId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSessionAction(): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });
  if (!BILLING_UI_ENABLED) return { error: t("betaTestingDescription") };
  const priceId = process.env.STRIPE_PRICE_ID_PREMIUM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!stripe || !priceId || !appUrl) {
    return { error: t("stripeNotConfigured") };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true, betaOfferUsedAt: true },
  });

  const betaOfferApplies = canUseBetaOffer({
    email: user.email,
    betaOfferUsedAt: dbUser?.betaOfferUsedAt ?? null,
  });
  const betaCouponId = process.env.STRIPE_BETA_COUPON_ID;

  // Ne jamais laisser un bêta-testeur payer le tarif standard par erreur si
  // l'environnement n'est pas entièrement configuré.
  if (betaOfferApplies && !betaCouponId) {
    return { error: t("stripeNotConfigured") };
  }

  let session: Stripe.Checkout.Session;

  try {
    const customerId = await getOrCreateStripeCustomer({
      stripeClient: stripe,
      userId: user.id,
      email: user.email,
      existingCustomerId: dbUser?.stripeCustomerId ?? null,
    });

    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: betaOfferApplies && betaCouponId ? [{ coupon: betaCouponId }] : undefined,
      metadata: {
        userId: user.id,
        betaOfferApplied: String(betaOfferApplies),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          betaOfferApplied: String(betaOfferApplies),
        },
      },
      success_url: `${appUrl}/${locale}/account?checkout=success`,
      cancel_url: `${appUrl}/${locale}/account?checkout=cancel`,
    });
  } catch (error) {
    console.error("[billing] checkout session creation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: t("checkoutFailed") };
  }

  if (!session.url) {
    return { error: t("stripeNotConfigured") };
  }
  redirect(session.url);
}

export async function createBillingPortalSessionAction(): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });
  if (!BILLING_UI_ENABLED) return { error: t("betaTestingDescription") };

  if (!stripe || !process.env.NEXT_PUBLIC_APP_URL) {
    return { error: t("stripeNotConfigured") };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  if (!dbUser?.stripeCustomerId) {
    return { error: t("noSubscription") };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  let session: Stripe.BillingPortal.Session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${appUrl}/${locale}/account`,
    });
  } catch (error) {
    console.error("[billing] portal session creation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    return { error: t("checkoutFailed") };
  }

  redirect(session.url);
}
