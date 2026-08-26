"use client";

import { useEffect } from "react";
import { trackPublicGrowthEvent } from "@/lib/growth/client";

export function LandingViewTracker({ locale }: { locale: string }) {
  useEffect(() => {
    void trackPublicGrowthEvent("landing_view", { locale, device: window.innerWidth < 768 ? "mobile" : "desktop" });
  }, [locale]);
  return null;
}
