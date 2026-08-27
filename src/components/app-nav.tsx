"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ChartLineUp,
  House,
  Wallet,
  Scan,
  ChartBar,
  ListBullets,
  UserCircle,
  UsersThree,
  UserList,
  FileArrowUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/marketing/brand";
import { SignOutButton } from "@/components/account/sign-out-button";
import { PlanStatusSummary } from "@/components/account/plan-status-summary";
import type { Plan } from "@prisma/client";

const NAV_ITEMS = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/history", key: "history", icon: ListBullets },
  { href: "/scan", key: "scanner", desktopKey: "scannerDesktop", icon: Scan, primary: true },
  { href: "/import-history", key: "fileImport", icon: FileArrowUp },
  { href: "/stats", key: "stats", icon: ChartBar },
  { href: "/bankrolls", key: "bankrolls", icon: Wallet },
  { href: "/tipsters", key: "tipsters", icon: UserList },
  { href: "/referrals", key: "referrals", icon: UsersThree },
  { href: "/account", key: "account", icon: UserCircle },
] as const;

const DESKTOP_NAV_GROUPS = [
  { key: "tracking", items: NAV_ITEMS.slice(0, 4) },
  { key: "analysis", items: NAV_ITEMS.slice(4, 5) },
  { key: "manage", items: NAV_ITEMS.slice(5) },
] as const;

// Le Scan est l'action principale sur mobile : il doit rester au centre de la
// barre à cinq entrées, pas simplement conserver son ordre desktop.
const MOBILE_NAV_ORDER = ["home", "stats", "scanner", "bankrolls", "account"] as const;
const MOBILE_NAV_ITEMS = MOBILE_NAV_ORDER.map((key) => {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Entrée de navigation mobile introuvable : ${key}`);
  return item;
});

export function AppNav({
  plan,
  currentPeriodEnd,
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar/95 pb-[var(--rg-footer-h)] backdrop-blur-xl lg:flex">
        <div className="flex min-h-20 items-center border-b border-border px-5">
          <Link href="/dashboard" aria-label="Kalivoa">
            <Brand compact />
          </Link>
        </div>

        <nav aria-label={t("ariaLabel")} className="flex flex-1 flex-col px-3 py-5">
          <div className="flex flex-col gap-5">
            {DESKTOP_NAV_GROUPS.map(({ key: groupKey, items }) => (
              <div key={groupKey}>
                <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(`groups.${groupKey}`)}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {items.map(({ href, key, icon: Icon, ...item }) => {
                    const label = t("desktopKey" in item ? item.desktopKey : key);
                    const active = pathname.startsWith(href);
                    const isPrimary = "primary" in item && item.primary;

                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-touch items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isPrimary && "bg-primary text-primary-foreground shadow-[0_12px_28px_oklch(0.72_0.14_250_/_18%)] hover:bg-primary/90",
                            !isPrimary && active && "bg-primary/12 text-primary",
                            !isPrimary && !active && "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                          )}
                        >
                          <Icon size={20} weight={active || isPrimary ? "fill" : "regular"} aria-hidden />
                          <span>{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
            <PlanStatusSummary plan={plan} currentPeriodEnd={currentPeriodEnd} variant="sidebar" />
            <SignOutButton />
          </div>
        </nav>
      </aside>

      <nav
        aria-label={t("ariaLabel")}
        className="fixed inset-x-0 bottom-[var(--rg-footer-h)] z-50 glass-card border-x-0 border-b-0 lg:hidden"
      >
        <ul className="relative grid grid-cols-5 items-end">
          {MOBILE_NAV_ITEMS.map(({ href, key, icon: Icon, ...item }) => {
          const label = t(key);
          const active = pathname.startsWith(href);
          const isPrimary = "primary" in item && item.primary;

          if (isPrimary) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="absolute left-1/2 top-0 flex size-14 min-h-touch min-w-touch -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse-glow transition-transform active:scale-95"
                >
                  <Icon size={26} weight="bold" />
                </Link>
              </li>
            );
          }

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
          })}
        </ul>
        <PlanStatusSummary plan={plan} currentPeriodEnd={currentPeriodEnd} variant="mobile" />
      </nav>
    </>
  );
}

export function AppTopBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const currentItem = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const currentLabel = currentItem
    ? t("desktopKey" in currentItem ? currentItem.desktopKey : currentItem.key)
    : "Kalivoa";

  return (
    <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-border bg-background/88 px-6 backdrop-blur-xl lg:flex xl:px-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ChartLineUp size={18} className="text-primary" weight="bold" aria-hidden />
        <span>{currentLabel}</span>
      </div>
      <Link
        href="/scan"
        className="inline-flex min-h-touch items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_oklch(0.72_0.14_250_/_18%)] transition-transform hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Scan size={18} weight="bold" aria-hidden />
        {t("scannerDesktop")}
      </Link>
    </header>
  );
}
