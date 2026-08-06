"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";

// Checkout/Portail Stripe entièrement côté serveur : pas de Stripe.js côté
// navigateur, le client se contente d'appeler l'action et de laisser la
// redirection se produire (redirect() de next/navigation, pas celui i18n —
// la destination est un domaine externe, hors du routing interne de l'app).

export type BillingActionResult = { error: string } | undefined;

export async function createCheckoutSessionAction(): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });

  if (!stripe || !process.env.STRIPE_PRICE_ID_PREMIUM || !process.env.NEXT_PUBLIC_APP_URL) {
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

  let customerId = dbUser?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PREMIUM, quantity: 1 }],
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

  if (!session.url) {
    return { error: t("stripeNotConfigured") };
  }
  redirect(session.url);
}

export async function createBillingPortalSessionAction(): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });

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
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${appUrl}/${locale}/account`,
  });

  redirect(session.url);
}
