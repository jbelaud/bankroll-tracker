"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ChartLineUp,
  House,
  Wallet,
  BookmarksSimple,
  Scan,
  ChartBar,
  ListBullets,
  UserCircle,
  UsersThree,
  UserList,
  FileArrowUp,
  Gauge,
  Compass,
  CaretDown,
  List,
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
  { href: "/admin", key: "admin", icon: Gauge, adminOnly: true },
] as const;

const TIPSTER_SUB_ITEMS = [
  { href: "/discover", key: "discover", icon: Compass },
  { href: "/following", key: "following", icon: BookmarksSimple },
  { href: "/tipsters", key: "myTipsters", icon: UserList },
  { href: "/referrals", key: "referrals", icon: UsersThree },
] as const;

const BET_SUB_ITEMS = [
  { href: "/history", key: "history", icon: ListBullets },
  { href: "/import-history", key: "fileImport", icon: FileArrowUp },
] as const;

const DESKTOP_NAV_GROUPS = [
  { key: "tracking", items: [NAV_ITEMS[0], NAV_ITEMS[2], { key: "bets", icon: ListBullets, children: BET_SUB_ITEMS }] },
  { key: "analysis", items: [NAV_ITEMS[4]] },
  { key: "manage", items: [NAV_ITEMS[5], { key: "tipsters", icon: UserList, children: TIPSTER_SUB_ITEMS }, NAV_ITEMS[8], NAV_ITEMS[9]] },
] as const;

const MOBILE_MORE_GROUPS = [
  { key: "bets", items: BET_SUB_ITEMS },
  { key: "tipsters", items: TIPSTER_SUB_ITEMS },
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
  isAdmin,
}: {
  plan: Plan;
  currentPeriodEnd: Date | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tipsterSectionActive = TIPSTER_SUB_ITEMS.some((item) => pathname.startsWith(item.href));
  const betsSectionActive = BET_SUB_ITEMS.some((item) => pathname.startsWith(item.href));
  const [desktopMenuState, setDesktopMenuState] = useState<{ path: string; key: "bets" | "tipsters" | null } | null>(null);
  const [mobileMenuState, setMobileMenuState] = useState<{ path: string; open: boolean } | null>(null);
  const expandedDesktopMenu = desktopMenuState?.path === pathname ? desktopMenuState.key : betsSectionActive ? "bets" : tipsterSectionActive ? "tipsters" : null;
  const mobileMenuOpen = mobileMenuState?.path === pathname && mobileMenuState.open;
  const mobileMenuItems = [
    ...BET_SUB_ITEMS,
    ...TIPSTER_SUB_ITEMS,
    ...(isAdmin ? [NAV_ITEMS[9]] : []),
  ];

  return (
    <>
      <div className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" aria-label="Kalivoa">
          <Brand compact />
        </Link>
        <nav aria-label={t("moreNavigation")} className="relative">
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMobileMenuState({ path: pathname, open: !mobileMenuOpen })}
            className={cn(
              "flex min-h-touch items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mobileMenuOpen || mobileMenuItems.some((item) => pathname.startsWith(item.href)) ? "bg-primary/12 text-primary" : "bg-card/60 text-foreground",
            )}
          >
            <List size={19} aria-hidden />
            <span>{t("moreNavigation")}</span>
            <CaretDown size={15} className={cn("transition-transform", mobileMenuOpen && "rotate-180")} aria-hidden />
          </button>
          {mobileMenuOpen ? <div id="mobile-more-menu" className="absolute right-0 top-full mt-2 max-h-[calc(100dvh-10rem)] w-[min(19rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-2xl border border-border bg-background p-2 shadow-xl">
            {MOBILE_MORE_GROUPS.map(({ key: groupKey, items }) => <div key={groupKey}>
              <p className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">{t(groupKey)}</p>
              <ul className="space-y-1">{items.map(({ href, key, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return <li key={href}><Link href={href} onClick={() => setMobileMenuState({ path: pathname, open: false })} aria-current={active ? "page" : undefined} className={cn("flex min-h-touch items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon size={18} weight={active ? "fill" : "regular"} aria-hidden /><span>{t(key)}</span></Link></li>;
              })}</ul>
            </div>)}
            {isAdmin ? <div className="border-t border-border pt-2"><Link href="/admin" onClick={() => setMobileMenuState({ path: pathname, open: false })} aria-current={pathname.startsWith("/admin") ? "page" : undefined} className={cn("flex min-h-touch items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", pathname.startsWith("/admin") ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Gauge size={18} aria-hidden /><span>{t("admin")}</span></Link></div> : null}
          </div> : null}
        </nav>
      </div>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar/95 pb-[var(--rg-footer-h)] backdrop-blur-xl lg:flex">
        <div className="flex min-h-20 items-center border-b border-border px-5">
          <Link href="/dashboard" aria-label="Kalivoa">
            <Brand compact />
          </Link>
        </div>

        <nav aria-label={t("ariaLabel")} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5">
          <div className="flex flex-col gap-5">
            {DESKTOP_NAV_GROUPS.map(({ key: groupKey, items }) => (
              <div key={groupKey}>
                <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(`groups.${groupKey}`)}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {items.filter((item) => !("adminOnly" in item) || !item.adminOnly || isAdmin).map((item) => {
                    const { key, icon: Icon } = item;
                    const label = t("desktopKey" in item ? item.desktopKey : key);

                    if ("children" in item) {
                      const groupActive = item.children.some((child) => pathname.startsWith(child.href));
                      const groupOpen = expandedDesktopMenu === item.key;
                      return <li key={item.key}>
                        <button
                          type="button"
                          aria-expanded={groupOpen}
                          aria-controls={`${item.key}-submenu`}
                          onClick={() => setDesktopMenuState({ path: pathname, key: groupOpen ? null : item.key })}
                          className={cn(
                            "flex min-h-touch w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            groupActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                          )}
                        >
                          <Icon size={20} weight={groupActive ? "fill" : "regular"} aria-hidden />
                          <span className="flex-1 text-left">{label}</span>
                          <CaretDown size={15} className={cn("transition-transform", groupOpen && "rotate-180")} aria-hidden />
                        </button>
                        {groupOpen ? <ul id={`${item.key}-submenu`} className="ml-5 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                          {item.children.map(({ href: childHref, key: childKey, icon: ChildIcon }) => {
                            const childActive = pathname.startsWith(childHref);
                            return <li key={childHref}><Link href={childHref} aria-current={childActive ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", childActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")}><ChildIcon size={17} weight={childActive ? "fill" : "regular"} aria-hidden /><span>{t(childKey)}</span></Link></li>;
                          })}
                        </ul> : null}
                      </li>;
                    }

                    const { href } = item;
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
                  "flex min-h-touch min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[0.65rem] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span className="max-w-full truncate">{label}</span>
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
  const currentTipsterItem = TIPSTER_SUB_ITEMS.find((item) => pathname.startsWith(item.href));
  const currentItem = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const currentLabel = currentTipsterItem
    ? `${t("tipsters")} · ${t(currentTipsterItem.key)}`
    : currentItem
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
