import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import archives from "@/lib/legal/terms-archive.json";
import { withdrawalDeadline } from "./withdrawal-deadline";
import { appBillingUrl, commercialRecordsEnabled, dateForCustomer } from "./commercial-config";
import { fetchStripePdf } from "./invoice-pdf";

function objectId(value: string | { id: string } | null | undefined) { return typeof value === "string" ? value : value?.id; }
export async function archiveBillingInvoice(client: Stripe, invoice: Stripe.Invoice) {
  if (!commercialRecordsEnabled()) return;
  const subscriptionId = objectId(invoice.parent?.subscription_details?.subscription);
  const customerId = objectId(invoice.customer);
  if (!subscriptionId || !customerId) return;
  const owner = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
  const archivedContract = !owner ? await prisma.billingContract.findUnique({ where: { id: subscriptionId } }) : null;
  const userId = owner?.id ?? (archivedContract?.customerId === customerId ? archivedContract.userId : null);
  if (!userId) return;
  const issuedAt = new Date(invoice.created * 1000); const retainUntil = new Date(issuedAt); retainUntil.setUTCFullYear(retainUntil.getUTCFullYear() + 10);
  const snapshot = { id: invoice.id, number: invoice.number, status: invoice.status, customerId, customerName: invoice.customer_name,
    customerEmail: invoice.customer_email, customerAddress: invoice.customer_address, currency: invoice.currency,
    subtotal: invoice.subtotal, total: invoice.total, amountPaid: invoice.amount_paid, amountRemaining: invoice.amount_remaining,
    totalTaxes: invoice.total_taxes, invoicePdf: invoice.invoice_pdf, hostedInvoiceUrl: invoice.hosted_invoice_url };
  const existing = await prisma.billingInvoice.findUnique({ where: { id: invoice.id } });
  const pdfContent = existing?.pdfContent ?? (invoice.invoice_pdf ? await fetchStripePdf(invoice.invoice_pdf) : undefined);
  const previous = existing?.snapshot && typeof existing.snapshot === "object" && !Array.isArray(existing.snapshot) ? existing.snapshot : {};
  const combined = { ...previous, ...snapshot } as unknown as Prisma.InputJsonValue;
  await prisma.billingInvoice.upsert({ where: { id: invoice.id }, create: { id: invoice.id, userId, subscriptionId, issuedAt, retainUntil, snapshot: combined, pdfContent }, update: { snapshot: combined, ...(pdfContent ? { pdfContent } : {}) } });
}

export async function archiveContractAndNotifications(client: Stripe, subscriptionId: string) {
  if (!commercialRecordsEnabled()) return;
  const subscription = await client.subscriptions.retrieve(subscriptionId);
  const customerId = objectId(subscription.customer);
  if (!customerId || subscription.metadata.app !== "kalivoa") return;
  const owner = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true, email: true } });
  if (!owner) return;
  let contract = await prisma.billingContract.findUnique({ where: { id: subscriptionId } });
  if (!contract && subscription.metadata.termsAccepted === "true") {
    const locale = subscription.metadata.contractLocale === "en" ? "en" : "fr";
    const version = subscription.metadata.termsVersion;
    const texts = (archives as Record<string, { fr: string; en: string }>)[version];
    if (!texts) throw new Error("Contract version not archived");
    const invoices = await client.invoices.list({ subscription: subscriptionId, limit: 100 });
    const first = invoices.data.find((invoice) => invoice.billing_reason === "subscription_create" && invoice.status === "paid");
    if (!first) { if (invoices.has_more) throw new Error("Initial invoice requires review"); return; }
    const paidAt = new Date((first.status_transitions.paid_at ?? first.created) * 1000);
    const acceptedAt = new Date(subscription.created * 1000);
    // Deadline starts at contract conclusion, never at a later webhook delivery.
    contract = await prisma.billingContract.upsert({ where: { id: subscriptionId }, update: {}, create: {
      id: subscriptionId, userId: owner.id, customerId, email: first.customer_email ?? owner.email,
      name: first.customer_name ?? "", locale, billingInterval: subscription.metadata.billingInterval,
      termsVersion: version, termsText: texts[locale], acceptedAt, paidAt,
      withdrawalDeadline: withdrawalDeadline(acceptedAt), firstInvoiceId: first.id, firstAmountPaid: first.amount_paid,
      currency: first.currency, periodEnd: subscription.items.data[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000) : null,
    } });
  }
  if (!contract) return;
  await archiveBillingInvoice(client, await client.invoices.retrieve(contract.firstInvoiceId));
  const locale = contract.locale; const en = locale === "en";
  const periodEnd = subscription.items.data[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000) : null;
  const amount = new Intl.NumberFormat(en ? "en-GB" : "fr-FR", { style: "currency", currency: contract.currency }).format(contract.firstAmountPaid / 100);
  const end = periodEnd ? dateForCustomer(periodEnd, locale) : "";
  const termsAttachment = [{ filename: `Kalivoa-CGV-${contract.termsVersion}-${locale}.txt`, content: contract.termsText }];
  const receiptText = en
    ? `Kalivoa subscription confirmed\n\nContract: ${contract.id}\nBilling: ${contract.billingInterval}\nPaid: ${amount}\nContract concluded: ${dateForCustomer(contract.acceptedAt, locale)}\nCurrent period ends: ${end}\nAutomatic renewal unless cancelled.\n\nYou requested immediate activation and retain a full-refund withdrawal right until ${dateForCustomer(new Date(contract.withdrawalDeadline.getTime() - 1), locale)}. Use ${appBillingUrl(locale)} to manage cancellation and withdrawal. The accepted sales terms are attached.\n\nETS BELAUD — contact.kalivoa@gmail.com`
    : `Confirmation de ton abonnement Kalivoa\n\nContrat : ${contract.id}\nPériodicité : ${contract.billingInterval === "yearly" ? "annuelle" : "mensuelle"}\nMontant payé : ${amount}\nContrat conclu le : ${dateForCustomer(contract.acceptedAt, locale)}\nFin de la période en cours : ${end}\nRenouvellement automatique sauf résiliation.\n\nTu as demandé l’activation immédiate et tu conserves ton droit de rétractation avec remboursement intégral jusqu’au ${dateForCustomer(new Date(contract.withdrawalDeadline.getTime() - 1), locale)}. Gère la résiliation ou la rétractation depuis ${appBillingUrl(locale)}. Les CGV acceptées sont jointes à ce message.\n\nETS BELAUD — contact.kalivoa@gmail.com`;
  await prisma.transactionalEmail.upsert({ where: { dedupeKey: `contract:${contract.id}` }, update: {}, create: { userId: owner.id, dedupeKey: `contract:${contract.id}`, kind: "CONTRACT", recipient: contract.email, subject: en ? "Your Kalivoa subscription confirmation" : "Confirmation de ton abonnement Kalivoa", text: receiptText, attachments: termsAttachment } });
  const cancellationDate = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : subscription.cancel_at_period_end ? periodEnd : null;
  const terminal = ["canceled", "incomplete_expired"].includes(subscription.status);
  const fingerprint = terminal ? `ended:${subscription.ended_at ?? subscription.canceled_at ?? subscription.created}` : cancellationDate ? `scheduled:${cancellationDate.getTime()}` : "active";
  if (fingerprint !== "active" && fingerprint !== contract.cancellationFingerprint) {
    const ends = terminal ? new Date((subscription.ended_at ?? subscription.canceled_at ?? subscription.created) * 1000) : cancellationDate!;
    await prisma.transactionalEmail.upsert({ where: { dedupeKey: `cancellation:${contract.id}:${fingerprint}` }, update: {}, create: { userId: owner.id, dedupeKey: `cancellation:${contract.id}:${fingerprint}`, kind: "CANCELLATION", recipient: contract.email, subject: en ? "Kalivoa cancellation confirmation" : "Confirmation de résiliation Kalivoa", text: en ? `Contract ${contract.id}: paid access ends on ${dateForCustomer(ends, locale)}. Renewal is cancelled. Your free account and remaining permanent credits are retained; using those credits requires a paid subscription.\n${appBillingUrl(locale)}` : `Contrat ${contract.id} : l’accès payant prend fin le ${dateForCustomer(ends, locale)}. Le renouvellement est annulé. Ton compte gratuit et tes crédits permanents restants sont conservés ; leur utilisation exige un abonnement payant.\n${appBillingUrl(locale)}` } });
  }
  await prisma.billingContract.update({ where: { id: contract.id }, data: { periodEnd, cancellationFingerprint: fingerprint, ...(terminal && !contract.endedAt ? { endedAt: new Date((subscription.ended_at ?? subscription.canceled_at ?? subscription.created) * 1000) } : {}) } });
}

function htmlEscape(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
export async function queueAnnualReminders(client: Stripe, now = new Date()) {
  const candidates = await prisma.billingContract.findMany({ where: { billingInterval: "yearly", endedAt: null, periodEnd: { gt: now, lte: new Date(now.getTime() + 45 * 86_400_000) } }, take: 100, orderBy: { periodEnd: "asc" } });
  let queued = 0;
  for (const contract of candidates) {
    const subscription = await client.subscriptions.retrieve(contract.id);
    if (subscription.status !== "active" || subscription.cancel_at || subscription.cancel_at_period_end) continue;
    const item = subscription.items.data[0]; if (!item?.current_period_end) continue;
    const end = new Date(item.current_period_end * 1000);
    if (end.getTime() <= now.getTime() || end.getTime() - now.getTime() > 45 * 86_400_000) continue;
    const en = contract.locale === "en"; const date = dateForCustomer(end, contract.locale); const url = appBillingUrl(contract.locale);
    const subject = en ? "Your annual Kalivoa subscription will renew" : "Ton abonnement annuel Kalivoa va se renouveler";
    const amount = new Intl.NumberFormat(en ? "en-GB" : "fr-FR", { style: "currency", currency: item.price.currency }).format((item.price.unit_amount ?? 0) / 100);
    const text = en ? `Contract ${contract.id}\nYour annual subscription will renew on ${date} at ${amount}, tax included, unless cancelled.\n\nNON-RENEWAL DEADLINE: before ${date} (Paris time).\nCancel online: ${url}\nPaid access continues until the current period ends.\nETS BELAUD — contact.kalivoa@gmail.com` : `Contrat ${contract.id}\nTon abonnement annuel sera renouvelé le ${date} au tarif de ${amount} TTC, sauf résiliation.\n\nDATE LIMITE DE NON-RECONDUCTION : avant le ${date} (heure de Paris).\nRésilie en ligne : ${url}\nL’accès payant continue jusqu’à la fin de la période en cours.\nETS BELAUD — contact.kalivoa@gmail.com`;
    const html = `<p>${htmlEscape(text.split("\n\n")[0])}</p><div style="border:2px solid #222;padding:16px;margin:16px 0"><strong>${en ? "NON-RENEWAL DEADLINE" : "DATE LIMITE DE NON-RECONDUCTION"}</strong><p>${en ? "Before" : "Avant le"} ${htmlEscape(date)} (${en ? "Paris time" : "heure de Paris"}).</p></div><p><a href="${htmlEscape(url)}">${en ? "Cancel my subscription" : "Résilier mon abonnement"}</a></p><p>ETS BELAUD — contact.kalivoa@gmail.com</p>`;
    const late = end.getTime() - now.getTime() < 31 * 86_400_000;
    await prisma.transactionalEmail.upsert({ where: { dedupeKey: `annual:${contract.id}:${item.current_period_end}` }, update: {}, create: { userId: contract.userId, dedupeKey: `annual:${contract.id}:${item.current_period_end}`, kind: late ? "ANNUAL_RENEWAL_LATE" : "ANNUAL_RENEWAL", recipient: contract.email, subject, text, html } });
    queued++;
  }
  return queued;
}
