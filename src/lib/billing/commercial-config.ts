export function commercialRecordsEnabled() {
  return process.env.COMMERCIAL_RECORDS_ENABLED === "true";
}

export function appBillingUrl(locale: string) {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://kalivoa.com";
  const url = new URL(raw);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Invalid application origin");
  return `${url.origin}/${locale === "en" ? "en" : "fr"}/account/subscription`;
}

export function dateForCustomer(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(date);
}
