"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

export type DisplayUnit = "money" | "units";
const KEY = "kalivoa:private-display-unit:v1";
const EVENT = "kalivoa:display-unit-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function snapshot(): DisplayUnit {
  try { return window.localStorage.getItem(KEY) === "units" ? "units" : "money"; }
  catch { return "money"; }
}

export function useDisplayUnit(): DisplayUnit {
  return useSyncExternalStore(subscribe, snapshot, () => "money");
}

export function DisplayUnitToggle({ compact = false }: { compact?: boolean }) {
  const mode = useDisplayUnit();
  const locale = useLocale();
  const label = locale === "fr" ? "Montants des indicateurs" : "Metric amounts";
  return <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
    <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label={label}>
      {(["money", "units"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value}
        onClick={() => { try { window.localStorage.setItem(KEY, value); } catch { /* Preference remains local to this view. */ } window.dispatchEvent(new Event(EVENT)); }}
        className={`min-h-9 rounded-md font-semibold ${compact ? "px-1.5 text-[11px] sm:px-2.5 sm:text-xs" : "px-2.5"} ${mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        {value === "money" ? (locale === "fr" ? "Devise" : "Currency") : (locale === "fr" ? "Unité" : "Units")}
      </button>)}
    </div>
  </div>;
}
