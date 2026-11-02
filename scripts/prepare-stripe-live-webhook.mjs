/** Prepare one disabled live endpoint and one cached tax preview; never charge a customer. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import Stripe from "stripe";

const env = parseEnv(await readFile(".env.local", "utf8"));
if (!/^(sk|rk)_live_/.test(env.STRIPE_LIVE_SECRET_KEY ?? "")) throw new Error("Live credential required");
const expected = JSON.parse(await readFile("docs/audit-commercial/stripe-live-configuration-2026-10-19.json", "utf8"));
const client = new Stripe(env.STRIPE_LIVE_SECRET_KEY, { timeout: 10_000, maxNetworkRetries: 1 });
assert.equal((await client.accounts.retrieve()).id, expected.accountId, "Unexpected live account");
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ proposalOnly: true, live: true, accountId: expected.accountId,
    endpoint: "https://kalivoa.com/api/stripe/webhook", endpointWillBeDisabled: true,
    taxPreviews: 1, taxPreviewIsBillableByStripe: true, customerCharged: false }));
  process.exit(0);
}
await mkdir(".vercel/stripe-live", { recursive: true });
const statePath = ".vercel/stripe-live/preparation.json";
let state;
try { state = JSON.parse(await readFile(statePath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; state = { accountId: expected.accountId }; }
assert.equal(state.accountId, expected.accountId);
const save = () => writeFile(statePath, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
const registrations = await client.tax.registrations.list({ status: "active", limit: 100 });
assert.ok(!registrations.has_more && registrations.data.some((r) => r.country === "FR" && r.livemode));
if (!state.taxPreview) {
  const amounts = [499, 4999, 299, 2499];
  const preview = await client.tax.calculations.create({ currency: "eur",
    customer_details: { address: { country: "FR", postal_code: "75002", city: "Paris" }, address_source: "billing" },
    line_items: amounts.map((amount) => ({ amount, reference: `kalivoa-${amount}`, tax_behavior: "inclusive", tax_code: expected.taxCode })),
    expand: ["line_items"],
  }, { idempotencyKey: "kalivoa:live-tax-preview:2026-10-19" });
  // Persist immediately to avoid repeating billable previews on a repair run.
  state.taxPreview = { id: preview.id, amountTotal: preview.amount_total, vatIncluded: preview.tax_amount_inclusive,
    breakdown: preview.tax_breakdown, lines: preview.line_items?.data.map((line) => ({ reference: line.reference, amount: line.amount, vatIncluded: line.amount_tax })) };
  await save();
}
assert.equal(state.taxPreview.amountTotal, 8296);
assert.ok(state.taxPreview.breakdown.some((b) => b.taxability_reason === "standard_rated" && Number(b.tax_rate_details.percentage_decimal) === 20));
const events = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created",
  "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"];
const url = "https://kalivoa.com/api/stripe/webhook";
if (!state.webhookId) {
  const endpoints = await client.webhookEndpoints.list({ limit: 100 });
  assert.ok(!endpoints.has_more);
  assert.ok(!endpoints.data.some((e) => e.url === url), "Existing live endpoint must be reviewed, never replaced blindly");
  const endpoint = await client.webhookEndpoints.create({ url, enabled_events: events, api_version: "2026-08-26.dahlia",
    description: "Kalivoa — production préparée ; garder désactivé avant validation du déploiement commercial",
    metadata: { app: "kalivoa", preparation_date: "2026-10-19" },
  }, { idempotencyKey: "kalivoa:live-webhook-preparation:2026-10-19" });
  state.webhookId = endpoint.id; state.webhookSecret = endpoint.secret;
  await save();
}
const endpoint = await client.webhookEndpoints.retrieve(state.webhookId);
assert.equal(endpoint.url, url); assert.equal(endpoint.livemode, true);
assert.deepEqual([...endpoint.enabled_events].sort(), [...events].sort());
if (endpoint.status !== "disabled") await client.webhookEndpoints.update(endpoint.id, { disabled: true });
const verified = await client.webhookEndpoints.retrieve(endpoint.id);
assert.equal(verified.status, "disabled");
assert.equal(verified.api_version, "2026-08-26.dahlia");
if (!/^whsec_/.test(state.webhookSecret ?? "")) throw new Error("Stored webhook signing secret missing");
state.webhookDisabled = true; state.apiVersion = verified.api_version;
await save();
console.log(JSON.stringify({ accountId: expected.accountId, endpointId: endpoint.id, status: verified.status,
  apiVersion: verified.api_version, events: verified.enabled_events.length, taxPreview: state.taxPreview,
  customerCharged: false, productionDeploymentPerformed: false }, null, 2));
