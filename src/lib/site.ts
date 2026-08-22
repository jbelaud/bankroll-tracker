const LOCAL_FALLBACK_URL = "http://localhost:3000";

/**
 * The only public-origin configuration used by metadata, crawlers and public
 * links. Production must provide NEXT_PUBLIC_APP_URL (already required by
 * authentication and Stripe).
 */
export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? LOCAL_FALLBACK_URL;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return LOCAL_FALLBACK_URL;
  }
}

export function getSiteUrlForPath(pathname = "/"): string {
  return new URL(pathname, getSiteUrl()).toString();
}

/**
 * Vercel previews must not be indexed. Outside Vercel, a production build
 * remains indexable when NEXT_PUBLIC_APP_URL is configured.
 */
export function isProductionDeployment(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return process.env.NODE_ENV === "production";
}
