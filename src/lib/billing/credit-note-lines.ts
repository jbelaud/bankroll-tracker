import type Stripe from "stripe";

/** Credit original invoice lines so Stripe reverses their discounts and VAT. */
export function fullInvoiceCreditLines(invoice: Stripe.Invoice): Stripe.CreditNoteCreateParams.Line[] {
  if (invoice.lines.has_more || invoice.lines.data.length !== 1 || invoice.amount_paid !== invoice.total) throw new Error("INVOICE_LINES_REQUIRE_REVIEW");
  return invoice.lines.data.map((line) => {
    if (!Number.isSafeInteger(line.quantity) || !line.quantity || line.quantity < 1 || line.amount < 0) throw new Error("INVOICE_LINES_REQUIRE_REVIEW");
    return { type: "invoice_line_item", invoice_line_item: line.id, quantity: line.quantity };
  });
}

export function assertFullInvoiceCredit(credit: Stripe.CreditNote, invoice: Stripe.Invoice) {
  const invoiceId = typeof credit.invoice === "string" ? credit.invoice : credit.invoice.id;
  const invoiceTax = (invoice.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0);
  const creditTax = (credit.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0);
  if (invoiceId !== invoice.id || credit.total !== invoice.amount_paid || creditTax !== invoiceTax) throw new Error("CREDIT_INVOICE_OR_TAX_MISMATCH");
}
