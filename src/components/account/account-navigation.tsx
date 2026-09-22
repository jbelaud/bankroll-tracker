"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account", key: "overview" },
  { href: "/account/profile", key: "profile" },
  { href: "/account/subscription", key: "subscription" },
  { href: "/account/tracking", key: "tracking" },
  { href: "/account/public-profile", key: "public" },
  { href: "/account/data", key: "data" },
] as const;

export function AccountNavigation() {
  const pathname = usePathname();
  const t = useTranslations("account");

  return (
    <aside className="hidden min-w-0 lg:block">
      <nav aria-label={t("title")} className="sticky top-24 space-y-1">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("title")}</p>
        {items.map(({ href, key }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", pathname === href ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}>
            {t(`navigation.${key}`)}
          </Link>
        ))}
        <div className="mt-3 border-t border-border pt-3">
          <Link href="/account/help" aria-current={pathname === "/account/help" ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", pathname === "/account/help" ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}>{t("navigation.help")}</Link>
        </div>
      </nav>
    </aside>
  );
}
