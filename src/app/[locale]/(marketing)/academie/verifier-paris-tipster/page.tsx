import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { academyContent } from "@/lib/academy-content";
import { academyTipsterContent, academyTipsterPath, tipsterBankrollSlug } from "@/lib/academy-tipster-content";
import { marketingMetadata } from "@/lib/marketing-seo";
import { getSiteUrlForPath } from "@/lib/site";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = academyTipsterContent[locale];
  return marketingMetadata({ locale, path: academyTipsterPath, title, description });
}

export default async function TipsterEvidenceArticlePage({ params }: Props) {
  const { locale } = await params;
  const copy = academyTipsterContent[locale];
  const pageUrl = getSiteUrlForPath(`/${locale}${academyTipsterPath}`);
  const bankrollPath = `/${locale}/p/${tipsterBankrollSlug}`;
  const bankrollUrl = getSiteUrlForPath(bankrollPath);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: copy.title,
      description: copy.description,
      datePublished: "2026-10-08",
      dateModified: "2026-10-08",
      inLanguage: locale,
      mainEntityOfPage: pageUrl,
      citation: bankrollUrl,
      author: { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) },
      publisher: { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Kalivoa", item: getSiteUrlForPath(`/${locale}`) },
        { "@type": "ListItem", position: 2, name: academyContent[locale].hub.title, item: getSiteUrlForPath(`/${locale}/academie`) },
        { "@type": "ListItem", position: 3, name: copy.title, item: pageUrl },
      ],
    },
  ];

  return (
    <>
      {structuredData.map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      ))}
      <article className="kalivoa-content-frame py-12 sm:py-20">
        <nav aria-label={locale === "fr" ? "Fil d'Ariane" : "Breadcrumb"} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" locale={locale} className="hover:text-foreground">Kalivoa</Link>
          <span aria-hidden>/</span>
          <Link href="/academie" locale={locale} className="hover:text-foreground">{academyContent[locale].hub.title}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="text-foreground">{copy.eyebrow}</span>
        </nav>

        <header className="mt-10 max-w-3xl">
          <p className="marketing-eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.lead}</p>
        </header>

        <div className="mt-14 max-w-3xl space-y-14">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.methodTitle}</h2>
            <ol className="mt-6 space-y-4">
              {copy.method.map((step, index) => (
                <li key={step.title} className="marketing-card flex gap-4 p-5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.exampleTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.exampleIntro}</p>
            <div className="marketing-card mt-6 overflow-hidden">
              <p className="border-b border-border px-5 py-4 text-sm font-semibold">{copy.observedAt}</p>
              <dl className="divide-y divide-border">
                {copy.evidenceRows.map(({ label, value }) => (
                  <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-2 sm:gap-5">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-5 leading-8 text-muted-foreground">{copy.exampleConclusion}</p>
            <p className="mt-3 text-sm"><a href={bankrollPath} className="font-medium text-primary hover:underline">{copy.bankrollLink} ↗</a></p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.observationTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.observation}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.limitsTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.limits}</p>
          </section>

          <section className="marketing-solution p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{copy.sourceLabel}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6">
              <li><a href={bankrollPath} className="font-medium text-primary hover:underline">{copy.bankrollLink}</a></li>
              <li><Link href="/bankroll-tracking" locale={locale} className="font-medium text-primary hover:underline">{copy.trackingLink}</Link></li>
              <li><Link href="/responsible-gambling" locale={locale} className="font-medium text-primary hover:underline">{copy.responsibleLink}</Link></li>
            </ul>
          </section>

          <Link href="/academie" locale={locale} className="inline-flex font-semibold text-primary hover:underline">← {copy.backToAcademy}</Link>
        </div>
      </article>
    </>
  );
}
