import { ArrowRight, CheckCircle, House } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getSiteUrlForPath } from "@/lib/site";

type MarketingPageKey =
  | "features"
  | "import"
  | "bankroll"
  | "pricing"
  | "bookmakers"
  | "contact"
  | "legal"
  | "sales";

const pagePaths: Record<MarketingPageKey, string> = {
  features: "/features",
  import: "/screenshot-import",
  bankroll: "/bankroll-tracking",
  pricing: "/pricing",
  bookmakers: "/bookmakers",
  contact: "/contact",
  legal: "/legal-notice",
  sales: "/sales-terms",
};

export async function MarketingInfoPage({
  locale,
  page,
}: {
  locale: Locale;
  page: MarketingPageKey;
}) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const text = (key: string) => t(key as never);
  const pageKey = "pages." + page + ".";
  const common = await getTranslations({ locale, namespace: "marketing.info" });
  const path = pagePaths[page];
  const homeHref = "/" + locale;
  const currentHref = homeHref + path;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Kalivoa",
        item: getSiteUrlForPath(homeHref),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: text(pageKey + "title"),
        item: getSiteUrlForPath(currentHref),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="marketing-section">
        <div className="marketing-container">
          <nav aria-label={common("breadcrumbAriaLabel")} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground">
              <House size={14} aria-hidden />
              {common("home")}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page">{text(pageKey + "title")}</span>
          </nav>
          <header className="mt-10 max-w-3xl">
            <p className="marketing-eyebrow">{text(pageKey + "eyebrow")}</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{text(pageKey + "title")}</h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">{text(pageKey + "description")}</p>
          </header>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">{text(pageKey + "sectionTitle")}</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{text(pageKey + "intro")}</p>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {["one", "two", "three"].map((key) => (
              <article key={key} className="marketing-card p-6">
                <CheckCircle size={21} className="text-profit" weight="fill" aria-hidden />
                <h3 className="mt-5 text-base font-semibold">{text(pageKey + "points." + key + ".title")}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(pageKey + "points." + key + ".description")}</p>
              </article>
            ))}
          </section>

          <section className="marketing-solution mt-8 max-w-4xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{text(pageKey + "notice.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(pageKey + "notice.description")}</p>
          </section>

          <Link href="/signup" locale={locale} className="marketing-primary-cta mt-10">
            {common("cta")}
            <ArrowRight size={18} weight="bold" aria-hidden />
          </Link>
        </div>
      </article>
    </>
  );
}
