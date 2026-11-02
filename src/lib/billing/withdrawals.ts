import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { syncStripeSubscription, stripeObjectId } from "./subscription-sync";
import { dateForCustomer } from "./commercial-config";
import { fetchStripePdf } from "./invoice-pdf";
import { fullInvoiceCreditLines, assertFullInvoiceCredit } from "./credit-note-lines";

export function withdrawalAcknowledgement(request: { id: string; subscriptionId: string; name: string; email: string; declaration: string; receivedAt: Date }, locale: string) {
  return locale === "en"
    ? `Kalivoa — withdrawal acknowledgement\nOperated by ETS BELAUD\nReference: ${request.id}\nContract: ${request.subscriptionId}\nName: ${request.name}\nEmail: ${request.email}\nDeclaration: ${request.declaration}\nReceived: ${dateForCustomer(request.receivedAt, locale)} (Europe/Paris)\nTimestamp: ${request.receivedAt.toISOString()}\n\nYour request has been recorded. This acknowledgement is not a refund confirmation.\ncontact.kalivoa@gmail.com`
    : `Kalivoa — accusé de réception de rétractation\nService exploité par ETS BELAUD\nRéférence : ${request.id}\nContrat : ${request.subscriptionId}\nNom et prénom : ${request.name}\nEmail : ${request.email}\nDéclaration : ${request.declaration}\nReçue le : ${dateForCustomer(request.receivedAt, locale)} (Europe/Paris)\nHorodatage : ${request.receivedAt.toISOString()}\n\nTa demande est enregistrée. Cet accusé de réception n’est pas une confirmation de remboursement.\ncontact.kalivoa@gmail.com`;
}

export async function recordWithdrawal(user: { id: string; email: string }, input: { subscriptionId: string; name: string; email: string; confirmed: boolean }, now = new Date()) {
  const name = input.name.trim(); const email = input.email.trim();
  if (input.confirmed !== true || name.length < 2 || name.length > 160 || email.toLowerCase() !== user.email.toLowerCase()) throw new Error("Invalid withdrawal declaration");
  const contract = await prisma.billingContract.findFirst({ where: { id: input.subscriptionId, userId: user.id } });
  if (!contract) throw new Error("Contract not found");
  const en = contract.locale === "en";
  const declaration = en ? "I withdraw from this Kalivoa subscription contract." : "Je me rétracte de ce contrat d’abonnement Kalivoa.";
  const eligible = now.getTime() < contract.withdrawalDeadline.getTime();
  // Unique subscription key preserves the first receipt time across retries.
  return prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.upsert({ where: { subscriptionId: contract.id }, update: {}, create: { subscriptionId: contract.id, userId: user.id, name, email, declaration, receivedAt: now, eligible, status: eligible ? "PENDING" : "NEEDS_REVIEW" } });
    const ack = withdrawalAcknowledgement(request, contract.locale);
    const acknowledgement = await tx.transactionalEmail.upsert({ where: { dedupeKey: `withdrawal-ack:${request.id}` }, update: {}, create: { userId: user.id, dedupeKey: `withdrawal-ack:${request.id}`, kind: "WITHDRAWAL_ACK", recipient: request.email, subject: en ? "Your Kalivoa withdrawal request" : "Ta demande de rétractation Kalivoa", text: ack, attachments: [{ filename: `Kalivoa-retractation-${request.id}.txt`, content: ack }] } });
    return { request, acknowledgement: acknowledgement.text };
  });
}

export async function processWithdrawal(client: Stripe, id: string) {
  const request = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!request || !request.eligible || ["COMPLETED", "NEEDS_REVIEW"].includes(request.status)) return;
  const now = new Date(); const lockToken = randomUUID();
  const lock = await prisma.withdrawalRequest.updateMany({ where: { id, status: { in: ["PENDING", "RETRY", "REFUND_PENDING"] }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { lockToken, lockedUntil: new Date(now.getTime() + 120_000), attemptCount: { increment: 1 } } });
  if (!lock.count) return;
  let externalSideEffect = false;
  try {
    const contract = await prisma.billingContract.findUniqueOrThrow({ where: { id: request.subscriptionId } });
    const subscription = await client.subscriptions.retrieve(contract.id);
    const invoice = await client.invoices.retrieve(contract.firstInvoiceId);
    if (request.userId !== contract.userId || stripeObjectId(subscription.customer) !== contract.customerId
      || stripeObjectId(invoice.customer) !== contract.customerId || stripeObjectId(invoice.parent?.subscription_details?.subscription) !== contract.id
      || invoice.billing_reason !== "subscription_create" || invoice.currency !== contract.currency
      || invoice.amount_paid !== contract.firstAmountPaid || invoice.status !== "paid") throw new Error("OWNERSHIP_OR_INVOICE_MISMATCH");
    let refundId = request.refundId; let creditNoteId = request.creditNoteId;
    let accountingCredit: Stripe.CreditNote | undefined;
    if (!creditNoteId && contract.firstAmountPaid > 0) {
      const credits = await client.creditNotes.list({ invoice: invoice.id, limit: 100 });
      if (credits.has_more) throw new Error("CREDIT_HISTORY_REQUIRES_REVIEW");
      const previous = credits.data.find((credit) => credit.metadata?.kalivoaWithdrawalId === request.id);
      if (credits.data.some((credit) => credit.status === "issued" && credit.id !== previous?.id)) throw new Error("EXISTING_CREDIT_REQUIRES_REVIEW");
      if (previous) { accountingCredit = previous; creditNoteId = previous.id; refundId = stripeObjectId(previous.refunds[0]?.refund); }
    }
    if (creditNoteId && !accountingCredit) accountingCredit = await client.creditNotes.retrieve(creditNoteId);
    if (accountingCredit) {
      assertFullInvoiceCredit(accountingCredit, invoice);
      if (accountingCredit.status !== "issued") throw new Error("CREDIT_STATUS_REQUIRES_REVIEW");
    }
    const creditLines = !creditNoteId && contract.firstAmountPaid > 0 ? fullInvoiceCreditLines(invoice) : undefined;
    if (creditLines) assertFullInvoiceCredit(await client.creditNotes.preview({ invoice: invoice.id, lines: creditLines }), invoice);
    if (subscription.status !== "canceled") {
      externalSideEffect = true;
      await client.subscriptions.cancel(contract.id, { invoice_now: false, prorate: false }, { idempotencyKey: `kalivoa:withdrawal:cancel:${request.id}` });
    }
    await syncStripeSubscription(client, contract.id);
    if (!creditNoteId && contract.firstAmountPaid > 0) {
      // Credit note + linked refund also reverses invoice tax and creates an accounting document.
      externalSideEffect = true;
      const credit = await client.creditNotes.create({ invoice: invoice.id, lines: creditLines, refund_amount: contract.firstAmountPaid,
        reason: "order_change", memo: "Rétractation Kalivoa — remboursement intégral", metadata: { kalivoaWithdrawalId: request.id } }, { idempotencyKey: `kalivoa:withdrawal:credit:${request.id}` });
      creditNoteId = credit.id; refundId = stripeObjectId(credit.refunds[0]?.refund);
      accountingCredit = credit;
    }
    await prisma.withdrawalRequest.updateMany({ where: { id, lockToken }, data: { creditNoteId, refundId, refundAmount: contract.firstAmountPaid } });
    if (accountingCredit) {
      assertFullInvoiceCredit(accountingCredit, invoice);
      const archived = await prisma.billingInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      const original = archived.snapshot && typeof archived.snapshot === "object" && !Array.isArray(archived.snapshot) ? archived.snapshot : {};
      const creditNotePdfContent = archived.creditNotePdfContent ?? (accountingCredit.pdf ? await fetchStripePdf(accountingCredit.pdf) : undefined);
      await prisma.billingInvoice.update({ where: { id: invoice.id }, data: { snapshot: { ...original, creditNoteId: accountingCredit.id, creditNotePdf: accountingCredit.pdf, refundedAmount: accountingCredit.amount }, ...(creditNotePdfContent ? { creditNotePdfContent } : {}) } });
    }
    if (contract.firstAmountPaid > 0) {
      if (!refundId) throw new Error("REFUND_REFERENCE_MISSING");
      const refund = await client.refunds.retrieve(refundId);
      if (refund.amount !== contract.firstAmountPaid || refund.currency !== contract.currency) throw new Error("REFUND_AMOUNT_MISMATCH");
      if (refund.status === "failed" || refund.status === "canceled") throw new Error("REFUND_FAILED");
      if (refund.status !== "succeeded") {
        await prisma.withdrawalRequest.updateMany({ where: { id, lockToken }, data: { status: "REFUND_PENDING", nextAttemptAt: new Date(now.getTime() + 3_600_000), lastError: null, lockToken: null, lockedUntil: null } }); return;
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.updateMany({ where: { id, lockToken }, data: { status: "COMPLETED", processedAt: now, lastError: null, lockToken: null, lockedUntil: null } });
      const amount = new Intl.NumberFormat(contract.locale === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: contract.currency }).format(contract.firstAmountPaid / 100);
      await tx.transactionalEmail.upsert({ where: { dedupeKey: `withdrawal-refund:${id}` }, update: {}, create: { userId: contract.userId, dedupeKey: `withdrawal-refund:${id}`, kind: "WITHDRAWAL_REFUND", recipient: request.email, subject: contract.locale === "en" ? "Kalivoa withdrawal refund confirmed" : "Remboursement de rétractation Kalivoa confirmé", text: contract.locale === "en" ? `Request ${id}: your subscription is cancelled and the ${amount} refund has been confirmed by Stripe. Your bank may take additional time to display it. No scan-use deduction was applied.` : `Demande ${id} : ton abonnement est résilié et le remboursement de ${amount} est confirmé par Stripe. Ta banque peut prendre un délai supplémentaire pour l’afficher. Aucune déduction pour les scans utilisés n’a été appliquée.` } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "PROCESSING_FAILED";
    const review = /MISMATCH|REQUIRES_REVIEW|REFUND_FAILED|MISSING/.test(reason) || request.attemptCount >= 9;
    await prisma.withdrawalRequest.updateMany({ where: { id, lockToken }, data: { status: review ? "NEEDS_REVIEW" : "RETRY", lastError: review ? reason : externalSideEffect ? "EXTERNAL_RESULT_UNCONFIRMED" : "PROCESSING_FAILED", nextAttemptAt: new Date(now.getTime() + 3_600_000), lockToken: null, lockedUntil: null } });
  }
}
export async function retryWithdrawals(client: Stripe) {
  const due = await prisma.withdrawalRequest.findMany({ where: { status: { in: ["PENDING", "RETRY", "REFUND_PENDING"] }, nextAttemptAt: { lte: new Date() } }, take: 5, select: { id: true }, orderBy: { nextAttemptAt: "asc" } });
  for (const request of due) await processWithdrawal(client, request.id);
  return due.length;
}
