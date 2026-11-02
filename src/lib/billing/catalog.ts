/** Public amounts in EUR cents; never import server credentials into this module. */
export const PREMIUM_PRICING = {
  monthly: { amount: 499, welcomeAmount: 299, interval: "month" },
  yearly: { amount: 4999, welcomeAmount: 2499, interval: "year" },
} as const;
export type BillingInterval = keyof typeof PREMIUM_PRICING;
export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}
export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount / 100);
}
