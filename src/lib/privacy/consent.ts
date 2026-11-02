export const ANALYTICS_CHOICE_COOKIE = "kalivoa_analytics_choice";
export const ANALYTICS_CHOICE_EVENT = "kalivoa:analytics-choice";
export const GROWTH_STORAGE_KEYS = ["kalivoa_growth_anonymous_id", "kalivoa_growth_first_touch"] as const;

export function readAnalyticsChoice(raw: string | undefined, now = new Date()): "accepted" | "refused" | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw));
    if (value.version !== 1 || !["accepted", "refused"].includes(value.choice)
      || typeof value.expiresAt !== "string" || !(Date.parse(value.expiresAt) > now.getTime())) return null;
    return value.choice;
  } catch { return null; }
}

export function browserAnalyticsChoice(): "accepted" | "refused" | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${ANALYTICS_CHOICE_COOKIE}=`))?.slice(ANALYTICS_CHOICE_COOKIE.length + 1);
  return readAnalyticsChoice(raw);
}

export function clearGrowthStorage() {
  try { for (const key of GROWTH_STORAGE_KEYS) window.localStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
}

export function setBrowserAnalyticsChoice(choice: "accepted" | "refused") {
  const now = new Date(); const expires = new Date(now); expires.setMonth(expires.getMonth() + 6);
  const value = encodeURIComponent(JSON.stringify({ version: 1, choice, expiresAt: expires.toISOString() }));
  document.cookie = `${ANALYTICS_CHOICE_COOKIE}=${value}; Path=/; Max-Age=${Math.floor((expires.getTime() - now.getTime()) / 1000)}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  if (choice === "refused") clearGrowthStorage();
  window.dispatchEvent(new Event(ANALYTICS_CHOICE_EVENT));
}
