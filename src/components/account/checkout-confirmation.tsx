"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CheckoutConfirmation } from "@/lib/billing/checkout-confirmation";

export function CheckoutConfirmationNotice({ status }: { status: CheckoutConfirmation }) {
  const router = useRouter();
  const en = useLocale() === "en";
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "pending") return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= 15) { clearInterval(timer); setTimedOut(true); }
    }, 2000);
    return () => clearInterval(timer);
  }, [status, router]);

  if (status === "closed") return null;
  const message = status === "confirmed"
    ? en ? "Your payment is confirmed. Your subscription is active." : "Ton paiement est confirmé. Ton abonnement est actif."
    : status === "pending" && !timedOut
      ? en ? "Your payment is being confirmed. Your subscription will update automatically. Please do not pay again." : "Ton paiement est en cours de confirmation. Ton abonnement va se mettre à jour automatiquement. Ne repaie pas."
      : en ? "Confirmation is taking longer than expected. Refresh this page or contact support before trying another payment." : "La confirmation prend plus de temps que prévu. Actualise cette page ou contacte le support avant de tenter un autre paiement.";
  return <section className="glass-card space-y-3 rounded-xl p-4" aria-label={en ? "Payment confirmation" : "Confirmation du paiement"}>
    <p role="status" className="text-sm">{message}</p>
    {(timedOut || status === "unavailable") && <Button variant="outline" onClick={() => router.refresh()}>{en ? "Refresh" : "Actualiser"}</Button>}
  </section>;
}
