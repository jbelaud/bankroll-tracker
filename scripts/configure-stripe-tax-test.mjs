import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import Stripe from "stripe";

const require = createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw new Error("Sandbox key required");
const client = new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
const proposal = JSON.parse(await readFile("docs/audit-commercial/stripe-tax-proposal-2026-10-11.json", "utf8"));
const account = await client.accounts.retrieve(null);
if (account.id !== proposal.sandboxAccountId || proposal.liveMode !== false) throw new Error("Unexpected sandbox");
const before = await client.tax.settings.retrieve();
if (before.head_office?.address?.country && before.head_office.address.country !== "FR") throw new Error("Unexpected existing head office");
if (!process.argv.includes("--apply")) throw new Error("Explicit --apply required after owner approval");
const code = await client.taxCodes.retrieve(proposal.proposedProductTaxCode);
if (code.name !== proposal.category) throw new Error("Unexpected canonical tax category");
await client.tax.settings.update({ head_office: { address: proposal.headOffice }, defaults: { tax_code: code.id, tax_behavior: "inclusive" } });
await client.products.update(proposal.productId, { tax_code: code.id });
let registrations = await client.tax.registrations.list({ limit: 100 });
if (registrations.has_more) throw new Error("Registration history requires review");
let registration = registrations.data.find((r) => r.country === "FR" && r.status === "active" && r.country_options.fr?.type === "standard");
if (!registration) registration = await client.tax.registrations.create({ country: "FR", country_options: { fr: { type: "standard", standard: { place_of_supply_scheme: "standard" } } }, active_from: "now" }, { idempotencyKey: "kalivoa:fr-domestic-tax:sandbox:2026-10-11" });
const settings = await client.tax.settings.retrieve();
registrations = await client.tax.registrations.list({ status: "active", limit: 100 });
if (settings.status !== "active" || !registrations.data.some((r) => r.id === registration.id)) throw new Error("Tax setup not active");
const checks = [];
for (const amount of [499, 4999, 299, 2499]) {
  const calculation = await client.tax.calculations.create({ currency: "eur", line_items: [{ amount, reference: `kalivoa-${amount}`, tax_behavior: "inclusive", tax_code: code.id }], customer_details: { address: { line1: "10 rue de la Paix", city: "Paris", postal_code: "75002", country: "FR" }, address_source: "billing" } });
  const breakdown = calculation.tax_breakdown;
  if (calculation.amount_total !== amount || !breakdown.some((b) => b.taxability_reason === "standard_rated" && Number(b.tax_rate_details.percentage_decimal) === 20)) throw new Error(`Unexpected tax calculation for ${amount}`);
  checks.push({ grossAmount: amount, currency: "eur", taxInclusiveAmount: calculation.tax_amount_inclusive, taxability: breakdown.map((b) => ({ reason: b.taxability_reason, rate: b.tax_rate_details.percentage_decimal })), totalUnchanged: true });
}
for (const file of [".env.local"]) {
  let source = await readFile(file, "utf8");
  for (const [key, value] of Object.entries({ STRIPE_AUTOMATIC_TAX_ENABLED: "true", STRIPE_PRODUCT_TAX_CODE: code.id })) {
    const regex = new RegExp(`^${key}=.*$`, "m"); source = regex.test(source) ? source.replace(regex, `${key}=${value}`) : `${source.trimEnd()}\n${key}=${value}\n`;
  }
  await writeFile(file, source);
}
await writeFile("docs/audit-commercial/stripe-tax-tests-2026-10-11.json", JSON.stringify({ date: "2026-10-11", accountId: account.id, sandbox: true, settingsStatus: settings.status, taxCode: code.id, registrationId: registration.id, registrationCountry: "FR", checks, ownerApproved: true, liveChanged: false }, null, 2) + "\n");
console.log(JSON.stringify({ sandbox: true, registrationCountry: "FR", taxCode: code.id, settingsStatus: settings.status, checks, liveChanged: false }));
