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
  const isImportJourney = page === "import";
  const isPricingJourney = page === "pricing";
  const isProductJourney = isImportJourney || isPricingJourney;
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
      <article className={isProductJourney ? "py-12 sm:py-20 lg:py-24" : "marketing-section"}>
        <div className="marketing-container">
          <nav aria-label={common("breadcrumbAriaLabel")} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground">
              <House size={14} aria-hidden />
              {common("home")}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="truncate">{text(pageKey + (isProductJourney ? "eyebrow" : "title"))}</span>
          </nav>
          <header className={`${isProductJourney ? "mt-6 sm:mt-10" : "mt-10"} max-w-3xl`}>
            <p className="marketing-eyebrow">{text(pageKey + "eyebrow")}</p>
            <h1 className={`${isProductJourney ? "mt-3 text-3xl sm:mt-4" : "mt-4 text-4xl"} text-balance font-semibold tracking-[-0.04em] sm:text-5xl`}>{text(pageKey + "title")}</h1>
            <p className={`${isProductJourney ? "mt-4 text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8" : "mt-6 text-lg leading-8"} text-pretty text-muted-foreground`}>{text(pageKey + "description")}</p>
            {isProductJourney ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" locale={locale} className="marketing-primary-cta">
                  {common("cta")}
                  <ArrowRight size={18} weight="bold" aria-hidden />
                </Link>
                <Link href={isImportJourney ? "/bookmakers" : "/features"} locale={locale} className="marketing-secondary-cta">
                  {isImportJourney
                    ? locale === "fr" ? "Voir les bookmakers compatibles" : "View compatible bookmakers"
                    : locale === "fr" ? "Voir les fonctionnalités" : "View features"}
                </Link>
              </div>
            ) : null}
          </header>

          <section className={`${isProductJourney ? "mt-10 sm:mt-14" : "mt-14"} max-w-3xl`}>
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">{text(pageKey + "sectionTitle")}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground sm:mt-4">{text(pageKey + "intro")}</p>
          </section>

          <section className={`${isProductJourney ? "mt-5 gap-3" : "mt-8 gap-4"} grid md:grid-cols-3`}>
            {["one", "two", "three"].map((key) => (
              <article key={key} className={`marketing-card ${isProductJourney ? "flex gap-3 p-4 md:block md:p-6" : "p-6"}`}>
                <CheckCircle size={21} className={`${isProductJourney ? "mt-0.5 shrink-0" : ""} text-profit`} weight="fill" aria-hidden />
                <div>
                  <h3 className={`${isProductJourney ? "md:mt-5" : "mt-5"} text-base font-semibold`}>{text(pageKey + "points." + key + ".title")}</h3>
                  <p className={`${isProductJourney ? "mt-1.5 md:mt-3" : "mt-3"} text-sm leading-6 text-muted-foreground`}>{text(pageKey + "points." + key + ".description")}</p>
                </div>
              </article>
            ))}
          </section>

          <section className={`marketing-solution max-w-4xl ${isProductJourney ? "mt-4 p-5 sm:mt-8 sm:p-8" : "mt-8 p-6 sm:p-8"}`}>
            <h2 className="text-xl font-semibold">{text(pageKey + "notice.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text(pageKey + "notice.description")}</p>
          </section>

          {!isProductJourney ? (
            <Link href="/signup" locale={locale} className="marketing-primary-cta mt-10">
              {common("cta")}
              <ArrowRight size={18} weight="bold" aria-hidden />
            </Link>
          ) : null}
        </div>
      </article>
    </>
  );
}
