"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  House,
  Wallet,
  Scan,
  ChartBar,
  UserCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", key: "home", icon: House },
  { href: "/bankrolls", key: "bankrolls", icon: Wallet },
  { href: "/scan", key: "scanner", icon: Scan, primary: true },
  { href: "/stats", key: "stats", icon: ChartBar },
  { href: "/account", key: "account", icon: UserCircle },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="fixed inset-x-0 bottom-[var(--rg-footer-h)] z-50 glass-card border-x-0 border-b-0"
    >
      <ul className="grid grid-cols-5 items-end">
        {NAV_ITEMS.map(({ href, key, icon: Icon, ...item }) => {
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
                  className="relative -top-5 flex size-14 min-h-touch min-w-touch items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse-glow transition-transform active:scale-95"
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
    </nav>
  );
}
