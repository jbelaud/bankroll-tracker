import "server-only";
import type Stripe from "stripe";

export async function verifyAutomaticTax(client: Stripe) {
  if (process.env.STRIPE_AUTOMATIC_TAX_ENABLED !== "true" || !process.env.STRIPE_PRODUCT_TAX_CODE) throw new Error("Tax configuration required before checkout");
  const [settings, registrations, product] = await Promise.all([
    client.tax.settings.retrieve(), client.tax.registrations.list({ status: "active", limit: 100 }),
    client.products.retrieve(process.env.STRIPE_PRODUCT_ID_PREMIUM!),
  ]);
  const code = typeof product.tax_code === "string" ? product.tax_code : product.tax_code?.id;
  // Both domestic schemes collect French VAT for the France-only launch.
  const frenchCollectionActive = registrations.data.some((registration) => {
    const france = registration.country_options.fr;
    return registration.country === "FR" && france?.type === "standard"
      && ["standard", "small_seller"].includes(france.standard?.place_of_supply_scheme ?? "");
  });
  if (settings.status !== "active" || settings.head_office?.address?.country !== "FR" || registrations.has_more
    || !frenchCollectionActive
    || code !== process.env.STRIPE_PRODUCT_TAX_CODE) throw new Error("Tax collection not ready");
}
