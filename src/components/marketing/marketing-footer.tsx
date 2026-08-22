import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Brand } from "./brand";
import { LanguageLink } from "./language-link";

export async function MarketingFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing.footer" });

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="marketing-container py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <section>
            <Brand />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{t("description")}</p>
            <LanguageLink locale={locale} label={t("languageAriaLabel")} className="mt-4 border border-border bg-background" />
          </section>
          <FooterColumn title={t("product")} locale={locale} links={[
            ["/features", t("features")],
            ["/screenshot-import", t("import")],
            ["/bookmakers", t("bookmakers")],
            ["/pricing", t("pricing")],
          ]} />
          <FooterColumn title={t("learn")} locale={locale} links={[
            ["/bankroll-tracking", t("bankroll")],
            ["/faq", t("faq")],
            ["/responsible-gambling", t("responsible")],
          ]} />
          <FooterColumn title={t("account")} locale={locale} links={[
            ["/login", t("login")],
            ["/signup", t("signup")],
            ["/contact", t("contact")],
          ]} />
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/privacy" locale={locale} className="hover:text-foreground">{t("privacy")}</Link>
            <Link href="/terms" locale={locale} className="hover:text-foreground">{t("terms")}</Link>
            <Link href="/legal-notice" locale={locale} className="hover:text-foreground">{t("legal")}</Link>
            <Link href="/sales-terms" locale={locale} className="hover:text-foreground">{t("sales")}</Link>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-warning/25 bg-warning-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
          {t("responsibleNotice")}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  locale,
}: {
  title: string;
  links: [string, string][];
  locale: Locale;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} locale={locale} className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              {label}
              <ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
