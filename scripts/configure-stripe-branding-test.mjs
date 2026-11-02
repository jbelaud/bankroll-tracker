import { createRequire } from "node:module";
import { writeFile, readFile } from "node:fs/promises";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const expectedAccount = "acct_1T7igFDNFQcoJN1N";
if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw new Error("Test key required");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15_000, maxNetworkRetries: 1 });
const initial = await stripe.accounts.retrieve();
if (initial.id !== expectedAccount) throw new Error("Unexpected sandbox");
const proposal = { business_profile: { name: "Kalivoa", url: "https://kalivoa.com", support_url: "https://kalivoa.com/fr/contact", support_email: "contact.kalivoa@gmail.com" }, settings: { payments: { statement_descriptor: "KALIVOA" }, card_payments: { statement_descriptor_prefix: "KALIVOA" } } };
const applied = process.argv.includes("--apply");
const report = { checkedAt: new Date().toISOString(), accountId: initial.id, livemode: false, legalEntity: "ETS BELAUD", proposal, applied, accountUpdate: "not_requested" };
if (applied) {
  try {
    await stripe.accounts.update(initial.id, proposal);
    report.accountUpdate = "success";
  } catch (error) {
    report.accountUpdate = "dashboard_required";
    report.accountError = { type: error.type ?? error.name, code: error.code ?? null };
  }
  const ids = await stripe.taxIds.list({ owner: { type: "self" }, limit: 100 });
  let vat = ids.data.find((id) => id.type === "eu_vat" && id.value === "FR61994223212");
  if (!vat) vat = await stripe.taxIds.create({ type: "eu_vat", value: "FR61994223212", owner: { type: "self" } }, { idempotencyKey: "kalivoa:sandbox:vat:FR61994223212" });
  report.sellerVatId = vat.id;
  try {
    const defaults = [...new Set([...(initial.settings?.invoices?.default_account_tax_ids ?? []).map((id) => typeof id === "string" ? id : id.id), vat.id])];
    await stripe.accounts.update(initial.id, { settings: { invoices: { default_account_tax_ids: defaults } } });
    report.invoiceVatDefault = "success";
  } catch (error) {
    report.invoiceVatDefault = "dashboard_required";
    report.invoiceVatError = { type: error.type ?? error.name, code: error.code ?? null };
  }
  let env = await readFile(".env.local", "utf8");
  const value = 'TRANSACTIONAL_EMAIL_FROM="Kalivoa <notifications@kalivoa.com>"';
  env = /^TRANSACTIONAL_EMAIL_FROM=.*$/m.test(env) ? env.replace(/^TRANSACTIONAL_EMAIL_FROM=.*$/m, value) : `${env.trimEnd()}\n${value}\n`;
  await writeFile(".env.local", env);
}
const account = await stripe.accounts.retrieve();
report.observed = { publicName: account.business_profile?.name ?? null, supportEmail: account.business_profile?.support_email ?? null, website: account.business_profile?.url ?? null, statementDescriptor: account.settings?.payments?.statement_descriptor ?? null, cardPrefix: account.settings?.card_payments?.statement_descriptor_prefix ?? null, defaultSellerTaxIds: account.settings?.invoices?.default_account_tax_ids ?? [] };
await writeFile("docs/audit-commercial/branding-kalivoa-2026-10-11.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
