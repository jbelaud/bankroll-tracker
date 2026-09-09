"use client";

import { useState } from "react";
import { Check, ShareNetwork } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function PublicShareButton({ locale, slug, bankrollName }: { locale: string; slug: string; bankrollName: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/${locale}/p/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${bankrollName} sur Kalivoa`, text: "Suis cette bankroll publique et ses performances certifiées sur Kalivoa.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  };

  return <Button type="button" variant="outline" onClick={share} className="min-h-11 rounded-xl px-4 text-sm">
    {copied ? <Check weight="bold" aria-hidden /> : <ShareNetwork weight="bold" aria-hidden />}
    {copied ? "Lien copié" : "Partager"}
  </Button>;
}
