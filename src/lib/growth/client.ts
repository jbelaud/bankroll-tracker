"use client";

import type { PublicGrowthEventName } from "./events";

const ANONYMOUS_ID_KEY = "kalivoa_growth_anonymous_id";
const FIRST_TOUCH_KEY = "kalivoa_growth_first_touch";

type ClientProperties = Record<string, string | number | boolean | null | undefined>;

export type AcquisitionContext = {
  anonymousId: string;
  acquisitionSource: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

function value(value: string | null) {
  return value?.trim().slice(0, 120) ?? "";
}

function sourceFromReferrer(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google.")) return "google_seo";
    if (host.includes("reddit.")) return "reddit";
    if (host.includes("discord.")) return "discord";
  } catch {
    // Référent non exploitable : rester sur direct plutôt que le conserver.
  }
  return "other_referral";
}

export function getAcquisitionContext(): AcquisitionContext {
  const existingAnonymousId = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  const anonymousId = existingAnonymousId || crypto.randomUUID();
  if (!existingAnonymousId) window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);

  const existingFirstTouch = window.localStorage.getItem(FIRST_TOUCH_KEY);
  if (existingFirstTouch) {
    try {
      return { anonymousId, ...JSON.parse(existingFirstTouch) } as AcquisitionContext;
    } catch {
      window.localStorage.removeItem(FIRST_TOUCH_KEY);
    }
  }

  const search = new URLSearchParams(window.location.search);
  const utmSource = value(search.get("utm_source"));
  const utmMedium = value(search.get("utm_medium"));
  const utmCampaign = value(search.get("utm_campaign"));
  const acquisitionSource = utmSource || sourceFromReferrer(document.referrer);
  const context = { anonymousId, acquisitionSource, utmSource, utmMedium, utmCampaign };
  window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ acquisitionSource, utmSource, utmMedium, utmCampaign }));
  return context;
}

export async function trackPublicGrowthEvent(name: PublicGrowthEventName, properties?: ClientProperties) {
  const acquisition = getAcquisitionContext();
  const payload = {
    name,
    anonymousId: acquisition.anonymousId,
    properties: { ...acquisition, ...properties },
  };
  try {
    await fetch("/api/growth-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // L'analytics ne doit jamais dégrader le parcours de l'utilisateur.
  }
}
