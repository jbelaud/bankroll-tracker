"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, ArrowUpRight } from "@phosphor-icons/react";
import { Link, useRouter } from "@/i18n/navigation";

export function PartnerReferralAlert({ initialCount, refreshOnChange = false }: { initialCount: number; refreshOnChange?: boolean }) {
  const t = useTranslations("partnerReferrals.admin");
  const [count, setCount] = useState(initialCount);
  const lastCount = useRef(initialCount);
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    const update = async () => {
      if (document.hidden || fetching) return;
      fetching = true;
      try {
        const response = await fetch("/api/admin/partner-referrals/count", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (Number.isSafeInteger(data.count) && data.count >= 0) {
          const changed = lastCount.current !== data.count;
          lastCount.current = data.count;
          setCount(data.count);
          if (changed && refreshOnChange) router.refresh();
        }
      } catch { /* Le lien reste disponible si la mise à jour est indisponible. */ }
      finally { fetching = false; }
    };
    const timer = setInterval(() => { void update(); }, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [refreshOnChange, router]);
  return <Link href="/admin/partners" className="flex min-h-14 flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">
    <Bell size={20} className="shrink-0 text-primary" aria-hidden />
    <span className="flex-1 text-sm font-semibold">{t("title")}</span>
    <span role="status" aria-live="polite" className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("pendingCount", { count })}</span>
    <ArrowUpRight size={17} aria-hidden />
  </Link>;
}
