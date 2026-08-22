import { List } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
import { LanguageLink } from "./language-link";

type HeaderLink = { href: string; key: "features" | "import" | "bookmakers" | "pricing" | "faq" };

const links: HeaderLink[] = [
  { href: "/features", key: "features" },
  { href: "/screenshot-import", key: "import" },
  { href: "/bookmakers", key: "bookmakers" },
  { href: "/pricing", key: "pricing" },
  { href: "/faq", key: "faq" },
];

export async function MarketingHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.header" });

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="marketing-container flex min-h-16 items-center justify-between gap-3">
        <Link href="/" locale={locale} aria-label={t("homeAriaLabel")}>
          <Brand />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label={t("navAriaLabel")}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              locale={locale}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 sm:flex">
          <LanguageLink locale={locale} label={t("languageAriaLabel")} />
          <Link
            href="/login"
            locale={locale}
            className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("login")}
          </Link>
          <Link
            href="/signup"
            locale={locale}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_oklch(0.72_0.14_250_/_22%)] transition-transform hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("cta")}
          </Link>
        </div>

        <details className="relative xl:hidden">
          <summary
            className="flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-card text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
            aria-label={t("menuAriaLabel")}
          >
            <List size={20} weight="bold" aria-hidden />
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.7rem)] flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-popover p-2 shadow-2xl">
            <nav className="flex flex-col" aria-label={t("navAriaLabel")}>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  locale={locale}
                  className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
            <div className="mt-1 border-t border-border pt-1">
              <LanguageLink locale={locale} label={t("languageAriaLabel")} className="w-full justify-between" />
              <Link
                href="/login"
                locale={locale}
                className="flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                locale={locale}
                className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t("cta")}
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
