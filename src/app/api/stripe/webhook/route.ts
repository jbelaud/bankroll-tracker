import { after, NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { stripeObjectId, syncStripeSubscription } from "@/lib/billing/subscription-sync";
import { archiveBillingInvoice } from "@/lib/billing/records";
import { commercialRecordsEnabled } from "@/lib/billing/commercial-config";
import { retryTransactionalEmails } from "@/lib/billing/transactional-emails";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.metadata?.app === "kalivoa"
          && ["paid", "no_payment_required"].includes(session.payment_status)) {
          const subscriptionId = stripeObjectId(session.subscription);
          if (subscriptionId) await syncStripeSubscription(stripe, subscriptionId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription(stripe, event.data.object.id);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = stripeObjectId(invoice.parent?.subscription_details?.subscription);
        if (subscriptionId) await syncStripeSubscription(stripe, subscriptionId);
        await archiveBillingInvoice(stripe, invoice);
        break;
      }
    }
  } catch (error) {
    // Stripe must retry failed writes. Never acknowledge a partially fulfilled event.
    console.error("[stripe webhook] processing failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  if (commercialRecordsEnabled()) after(async () => { await retryTransactionalEmails(); });
  return NextResponse.json({ received: true });
}
