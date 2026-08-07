"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale?: string }>();
  const english = locale === "en";
  useEffect(() => {
    console.error("[app] route render failed", error);
  }, [error]);

  return (
    <section className="glass-card my-auto flex flex-col gap-4 rounded-2xl p-5 text-center">
      <p className="text-sm font-semibold">{english ? "This page could not be loaded." : "Cette page n’a pas pu se charger."}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {english ? "Your data is safe. You can try again or return to your dashboard." : "Tes données ne sont pas perdues. Tu peux réessayer, ou revenir à ton tableau de bord."}
      </p>
      <div className="flex flex-col gap-2">
        <button onClick={reset} className="min-h-touch rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {english ? "Try again" : "Réessayer"}
        </button>
        <a href={`/${english ? "en" : "fr"}/dashboard`} className="min-h-touch rounded-lg border border-border px-4 py-3 text-sm font-semibold">
          {english ? "Back to dashboard" : "Revenir au tableau de bord"}
        </a>
      </div>
    </section>
  );
}
