export const SALES_TERMS_VERSION = "2026-10-22.1";

export type CheckoutDeclarations = {
  termsAccepted: boolean;
  immediateStartRequested: boolean;
  franceResident: boolean;
  billingAddress: { line1: string; city: string; postalCode: string };
};

export function hasCheckoutDeclarations(value: unknown): value is CheckoutDeclarations {
  if (!value || typeof value !== "object") return false;
  const declarations = value as Partial<CheckoutDeclarations>;
  return declarations.termsAccepted === true
    && declarations.immediateStartRequested === true
    && declarations.franceResident === true
    && validatedFrenchAddress(declarations.billingAddress) !== null;
}

export function validatedFrenchAddress(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const address = value as { line1?: unknown; city?: unknown; postalCode?: unknown };
  if (typeof address.line1 !== "string" || typeof address.city !== "string" || typeof address.postalCode !== "string") return null;
  const line1 = address.line1.trim(), city = address.city.trim(), postal_code = address.postalCode.trim();
  if (line1.length < 3 || line1.length > 200 || city.length < 2 || city.length > 120 || !/^\d{5}$/.test(postal_code)) return null;
  return { line1, city, postal_code, country: "FR" };
}
