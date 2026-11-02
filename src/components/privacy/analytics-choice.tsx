"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ANALYTICS_CHOICE_EVENT, browserAnalyticsChoice, clearGrowthStorage, setBrowserAnalyticsChoice } from "@/lib/privacy/consent";

export function AnalyticsChoice() {
  const en = useLocale() === "en";
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<"accepted" | "refused" | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const refresh = () => { const value = browserAnalyticsChoice(); setChoice(value); setReady(true); if (value !== "accepted") clearGrowthStorage(); };
    refresh(); window.addEventListener(ANALYTICS_CHOICE_EVENT, refresh);
    return () => window.removeEventListener(ANALYTICS_CHOICE_EVENT, refresh);
  }, []);
  if (!ready) return null;
  if (choice && !editing) return <button type="button" onClick={() => setEditing(true)} className="mx-auto min-h-touch px-4 py-2 text-xs text-muted-foreground underline underline-offset-4">{en ? "Privacy choices" : "Choix de confidentialité"}</button>;
  const decide = (value: "accepted" | "refused") => { setBrowserAnalyticsChoice(value); setEditing(false); };
  return <section aria-label={en ? "Optional audience measurement" : "Mesure d’audience facultative"} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 shadow-xl sm:p-5">
    <h2 className="text-sm font-semibold">{en ? "Your privacy choices" : "Tes choix de confidentialité"}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{en ? "Essential cookies keep the service working. With your permission, we also measure visits and feature usage to improve Kalivoa. Refusing has no effect on access. Your choice is retained for 6 months." : "Les cookies nécessaires permettent le fonctionnement du service. Avec ton accord, nous mesurons aussi les visites et l’utilisation des fonctions pour améliorer Kalivoa. Refuser ne change pas ton accès. Ton choix est conservé pendant 6 mois."}</p>
    <Link href="/privacy" className="mt-2 inline-flex min-h-touch items-center text-sm text-primary underline">{en ? "Read the privacy policy" : "Lire la confidentialité"}</Link>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <button type="button" onClick={() => decide("refused")} className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm font-semibold">{en ? "Refuse" : "Refuser"}</button>
      <button type="button" onClick={() => decide("accepted")} className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm font-semibold">{en ? "Accept" : "Accepter"}</button>
    </div>
  </section>;
}
