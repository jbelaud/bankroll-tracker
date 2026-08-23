"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Plan } from "@prisma/client";
import { Crown, Sparkle, Wallet } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PlanStatusVariant = "sidebar" | "mobile" | "card";

function formatPeriodEnd(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function PlanStatusSummary({
  plan,
  currentPeriodEnd,
  variant,
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  variant: PlanStatusVariant;
}) {
  const t = useTranslations("subscriptionStatus");
  const locale = useLocale();
  const paidPlan = plan === "BETA_PREMIUM" || plan === "PREMIUM";
  const isBeta = plan === "BETA_TESTER";
  const title = paidPlan
    ? t(plan === "BETA_PREMIUM" ? "betaPremium" : "premium")
    : t(isBeta ? "beta" : "freemium");
  const detail = paidPlan
    ? currentPeriodEnd
      ? t("periodEnd", { date: formatPeriodEnd(currentPeriodEnd, locale) })
      : t("active")
    : t(isBeta ? "betaDetail" : "freemiumDetail");
  const icon = paidPlan ? (
    <Crown size={16} weight="fill" aria-hidden />
  ) : isBeta ? (
    <Sparkle size={16} weight="fill" aria-hidden />
  ) : (
    <Wallet size={16} weight="fill" aria-hidden />
  );

  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          paidPlan ? "bg-primary/15 text-primary" : isBeta ? "bg-warning-muted text-warning" : "bg-muted text-muted-foreground",
          variant === "mobile" ? "size-7" : "size-8"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        {variant !== "mobile" && (
          <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {t("label")}
          </span>
        )}
        <span className="block truncate text-sm font-semibold">{title}</span>
      </span>
      <span
        className={cn(
          "shrink-0 text-muted-foreground",
          variant === "mobile" ? "max-w-36 truncate text-[0.65rem]" : "text-[0.65rem]"
        )}
      >
        {detail}
      </span>
    </>
  );

  if (variant === "card") {
    return <div className="flex items-center gap-3 rounded-lg bg-muted/55 px-3 py-2.5">{content}</div>;
  }

  return (
    <Link
      href="/account"
      aria-label={t("ariaLabel")}
      className={cn(
        "flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "sidebar"
          ? "rounded-xl border border-border bg-sidebar-accent/45 p-3 hover:bg-sidebar-accent"
          : "min-h-9 px-4 hover:bg-muted/55"
      )}
    >
      {content}
    </Link>
  );
}
