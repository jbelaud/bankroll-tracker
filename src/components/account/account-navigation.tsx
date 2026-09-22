"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account", key: "shortOverview" },
  { href: "/account/profile", key: "shortProfile" },
  { href: "/account/subscription", key: "shortSubscription" },
  { href: "/account/tracking", key: "shortTracking" },
  { href: "/account/public-profile", key: "shortPublic" },
  { href: "/account/data", key: "shortData" },
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const t = useTranslations("account");

  return (
    <nav aria-label={t("title")} className="hidden min-w-0 items-center border-b border-border lg:flex">
        {items.map(({ href, key }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:text-sm", pathname === href ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground")}>
            {t(`navigation.${key}`)}
          </Link>
        ))}
        <Link href="/account/help" aria-current={pathname === "/account/help" ? "page" : undefined} className={cn("-mb-px ml-auto flex min-h-11 shrink-0 items-center border-b-2 px-3 text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:text-sm", pathname === "/account/help" ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground")}>{t("navigation.shortHelp")}</Link>
    </nav>
  );
}
