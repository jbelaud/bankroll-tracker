"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { canUseBetaOffer } from "@/lib/billing/beta-offer";
import { isBetaPhaseActive } from "@/lib/beta/program";
import { isBillingInterval, type BillingInterval } from "@/lib/billing/catalog";
import { validateStripeCatalog } from "@/lib/billing/stripe-catalog";
import { WELCOME_OFFER_END } from "@/lib/billing/welcome-offer";
import { hasCheckoutDeclarations, validatedFrenchAddress, SALES_TERMS_VERSION, type CheckoutDeclarations } from "@/lib/billing/contract";
import { verifyAutomaticTax } from "@/lib/billing/tax-readiness";
import { verifyBillingLaunchConfiguration } from "@/lib/billing/launch-readiness";
import { COMPANY } from "@/lib/company";

export type BillingActionResult = { error: string } | undefined;

export async function createCheckoutSessionAction(interval: BillingInterval = "monthly", declarations?: CheckoutDeclarations): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });
  if (!isBillingInterval(interval)) return { error: t("stripeNotConfigured") };
  if (await isBetaPhaseActive()) return { error: t("betaTestingDescription") };
  if (!hasCheckoutDeclarations(declarations)) return { error: locale === "en"
    ? "Confirm the sales terms, immediate start and residence in France before continuing."
    : "Confirme les CGV, le démarrage immédiat et ta résidence en France avant de continuer." };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const client = stripe;
  if (!client || !appUrl) return { error: t("stripeNotConfigured") };
  const billingAddress = validatedFrenchAddress(declarations.billingAddress)!;
  const billingAddressHash = createHash("sha256").update(JSON.stringify(billingAddress)).digest("hex").slice(0, 24);

  let sessionUrl: string | null;
  try {
    verifyBillingLaunchConfiguration();
    // Serialize competing checkouts, including customer creation, for this app user.
    sessionUrl = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
      const dbUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const welcome = canUseBetaOffer({ email: user.email, betaOfferUsedAt: dbUser.betaOfferUsedAt,
        betaWelcomeEligible: dbUser.betaWelcomeEligible, earlyWelcomePosition: dbUser.earlyWelcomePosition });
      const offerEnd = Math.floor(WELCOME_OFFER_END.getTime() / 1000);
      const checkoutNow = Math.floor(Date.now() / 1000);
      const config = await validateStripeCatalog(client, interval, welcome);
      await verifyAutomaticTax(client);
      let customerId = dbUser.stripeCustomerId;
      if (customerId) {
        // A Stripe account change needs an explicit migration. Never silently replace
        // an unknown customer and risk creating a second paid subscription.
        const customer = await client.customers.retrieve(customerId);
        if (customer.deleted) throw new Error("Deleted billing customer");
      } else {
        const customer = await client.customers.create({ email: user.email,
          metadata: { app: "kalivoa", userId: user.id } },
        { idempotencyKey: `kalivoa:customer:${user.id}` });
        customerId = customer.id;
        await tx.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
      }
      // Validate the declared French billing address before payment and tax calculation.
      // No shipping address is used for this online service.
      await client.customers.update(customerId, { address: billingAddress, shipping: "" });
      const subscriptions = await client.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      if (subscriptions.has_more || subscriptions.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status))) {
        throw new Error("Existing subscription must be managed in the portal");
      }
      const sessions = await client.checkout.sessions.list({ customer: customerId, limit: 100 });
      if (sessions.has_more) throw new Error("Checkout history requires review");
      const metadata = { app: "kalivoa", userId: user.id, billingInterval: interval, betaOfferApplied: String(welcome),
        termsVersion: SALES_TERMS_VERSION, termsAccepted: "true", immediateStartRequested: "true", residenceCountry: "FR", contractLocale: locale, billingAddressHash };
      const open = sessions.data.filter((s) => s.status === "open" && s.mode === "subscription");
      const matching = open.find((s) => s.metadata?.app === metadata.app
        && s.metadata?.billingInterval === interval && s.metadata?.betaOfferApplied === metadata.betaOfferApplied
        && s.metadata?.termsVersion === metadata.termsVersion && s.metadata?.termsAccepted === "true"
        && s.metadata?.immediateStartRequested === "true" && s.metadata?.residenceCountry === "FR"
        && s.metadata?.contractLocale === locale
        && s.branding_settings?.display_name === COMPANY.publicBrand
        && s.metadata?.billingAddressHash === billingAddressHash && s.metadata?.automaticTax === "true"
        && s.metadata?.priceId === config.priceId && (!welcome || !s.expires_at || s.expires_at <= offerEnd));
      for (const previous of open) {
        if (previous.id !== matching?.id) await client.checkout.sessions.expire(previous.id);
      }
      if (matching?.url) return matching.url;
      if (welcome && offerEnd - checkoutNow <= 30 * 60) throw new Error("Welcome checkout deadline too close");
      // Stable request parameters for ambiguous retries; expired sessions start a new generation.
      const generation = sessions.data[0]?.id ?? "first";
      const idempotencyKey = `kalivoa:checkout:${SALES_TERMS_VERSION}:${locale}:${billingAddressHash}:${user.id}:${interval}:${welcome}:${generation}:${welcome && offerEnd - checkoutNow < 24 * 60 * 60 ? "deadline" : "default"}`;
      const suffix = [...createHash("sha256").update(idempotencyKey).digest().subarray(0, 8)]
        .map((n) => String.fromCharCode(97 + n % 26)).join("");
      const session = await client.checkout.sessions.create({
        mode: "subscription", customer: customerId, client_reference_id: user.id,
        branding_settings: { display_name: COMPANY.publicBrand },
        line_items: [{ price: config.priceId, quantity: 1 }],
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        customer_update: { name: "auto" },
        discounts: welcome ? [{ coupon: config.couponId! }] : undefined,
        ...(welcome && offerEnd - checkoutNow < 24 * 60 * 60 ? { expires_at: offerEnd } : {}),
        metadata: { ...metadata, priceId: config.priceId, automaticTax: "true" }, subscription_data: { metadata },
        integration_identifier: `kalivoa_${interval}_${suffix}`,
        success_url: `${appUrl}/${locale}/account/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/${locale}/account/subscription?checkout=cancel`,
      }, { idempotencyKey });
      return session.url;
    }, { maxWait: 10_000, timeout: 45_000 });
  } catch (error) {
    console.error("[billing] checkout failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: t("checkoutFailed") };
  }
  if (!sessionUrl) return { error: t("stripeNotConfigured") };
  redirect(sessionUrl);
}

export async function createBillingPortalSessionAction(): Promise<BillingActionResult> {
  const user = await requireUser();
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "account.plan" });
  if (await isBetaPhaseActive()) return { error: t("betaTestingDescription") };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  if (!stripe || !appUrl || !configuration || !process.env.STRIPE_ACCOUNT_ID) return { error: t("stripeNotConfigured") };
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { stripeCustomerId: true } });
  if (!dbUser?.stripeCustomerId) return { error: t("noSubscription") };
  let sessionUrl: string;
  try {
    const account = await stripe.accounts.retrieve(null);
    if (account.id !== process.env.STRIPE_ACCOUNT_ID) throw new Error("Unexpected Stripe account");
    const session = await stripe.billingPortal.sessions.create({ customer: dbUser.stripeCustomerId,
      configuration, return_url: `${appUrl}/${locale}/account/subscription` });
    sessionUrl = session.url;
  } catch (error) {
    console.error("[billing] portal failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return { error: t("checkoutFailed") };
  }
  redirect(sessionUrl);
}
