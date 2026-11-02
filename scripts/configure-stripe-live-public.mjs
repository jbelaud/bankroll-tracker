/** Seller VAT and portal links. Main-account support/invoice defaults require Dashboard. */
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import Stripe from "stripe";

const env = parseEnv(await readFile(".env.local", "utf8"));
if (!/^(sk|rk)_live_/.test(env.STRIPE_LIVE_SECRET_KEY ?? "")) throw new Error("Live credential required");
const client = new Stripe(env.STRIPE_LIVE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 1 });
const account = await client.accounts.retrieve();
assert.equal(account.id, "acct_1T7ifpRZcB561pgV");
const list = await client.taxIds.list({ owner: { type: "self" }, limit: 100 });
assert.ok(!list.has_more);
const value = "FR61994223212";
assert.ok(!list.data.some((t) => t.type === "eu_vat" && t.value?.startsWith("FR") && t.value !== value), "Different French VAT ID requires review");
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ proposalOnly: true, sellerVat: value, supportEmail: "contact.kalivoa@gmail.com", bankingChanged: false }));
  process.exit(0);
}
let vat = list.data.find((t) => t.type === "eu_vat" && t.value === value);
if (!vat) vat = await client.taxIds.create({ owner: { type: "self" }, type: "eu_vat", value }, { idempotencyKey: "kalivoa:seller-vat:FR61994223212" });
const portal = await client.billingPortal.configurations.update("bpc_1USM8ARZcB561pgVx5POB3k8", {
  business_profile: { headline: "Kalivoa — gérer mon abonnement", privacy_policy_url: "https://kalivoa.com/fr/privacy", terms_of_service_url: "https://kalivoa.com/fr/sales-terms" },
});
const updated = await client.accounts.retrieve();
const invoiceVatConfigured = (updated.settings.invoices.default_account_tax_ids ?? []).some((id) => (typeof id === "string" ? id : id.id) === vat.id);
assert.equal(portal.features.subscription_cancel.mode, "at_period_end");
console.log(JSON.stringify({ supportConfigured: updated.business_profile?.support_email === "contact.kalivoa@gmail.com", sellerVat: value, sellerTaxId: vat.id, invoiceVatConfigured,
  portalPrivacyUrl: portal.business_profile.privacy_policy_url, portalTermsUrl: portal.business_profile.terms_of_service_url,
  paidLaunchReady: false, bankingChanged: false, phoneChanged: false, customerCharged: false }));
