import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { academyArticlePath, academyContent } from "@/lib/academy-content";
import { academyCombinedContent, academyCombinedPath } from "@/lib/academy-combined-content";
import { marketingMetadata } from "@/lib/marketing-seo";
import { getSiteUrlForPath } from "@/lib/site";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = academyCombinedContent[locale];
  return marketingMetadata({ locale, path: academyCombinedPath, title, description });
}

export default async function CombinedBetArticle({ params }: Props) {
  const { locale } = await params;
  const copy = academyCombinedContent[locale];
  const pageUrl = getSiteUrlForPath(`/${locale}${academyCombinedPath}`);
  const organization = { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) };
  const schemas = [
    { "@context": "https://schema.org", "@type": "Article", headline: copy.title, description: copy.description,
      datePublished: "2026-10-08", dateModified: "2026-10-08", inLanguage: locale, mainEntityOfPage: pageUrl,
      author: organization, publisher: organization },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kalivoa", item: getSiteUrlForPath(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: academyContent[locale].hub.title, item: getSiteUrlForPath(`/${locale}/academie`) },
      { "@type": "ListItem", position: 3, name: copy.title, item: pageUrl },
    ] },
  ];

  return <>
    {schemas.map((schema) => <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />)}
    <article className="kalivoa-content-frame py-12 sm:py-20">
      <nav aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"} className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/" locale={locale}>Kalivoa</Link><span aria-hidden>/</span>
        <Link href="/academie" locale={locale}>{academyContent[locale].hub.title}</Link><span aria-hidden>/</span>
        <span aria-current="page">{copy.category}</span>
      </nav>
      <header className="mt-10 max-w-3xl">
        <p className="marketing-eyebrow">{copy.category}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{locale === "fr" ? "Rédaction Kalivoa · " : "Kalivoa editorial team · "}<time dateTime="2026-10-08">{locale === "fr" ? "8 octobre 2026" : "October 8, 2026"}</time></p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.lead}</p>
      </header>
      <div className="mt-14 max-w-3xl space-y-12">
        {copy.sections.map((section) => <section key={section.title}>
          <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-muted-foreground">{paragraph}</p>)}
        </section>)}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">{copy.evidenceTitle}</h2>
          <p className="mt-4 leading-8 text-muted-foreground">{copy.evidenceIntro}</p>
          <dl className="marketing-card mt-6 divide-y divide-border overflow-hidden">
            {copy.evidenceRows.map((row) => <div key={row.label} className="grid gap-2 p-5 sm:grid-cols-2">
              <dt className="text-sm text-muted-foreground">{row.label}</dt><dd className="font-medium">{row.value}</dd>
            </div>)}
          </dl>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{copy.evidenceNote}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">{copy.mistakesTitle}</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-muted-foreground">{copy.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
        </section>
        <section className="marketing-solution p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{copy.nextTitle}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link href={academyArticlePath} locale={locale} className="text-primary hover:underline">{copy.reviewLink}</Link></li>
            <li><Link href="/bankroll-tracking" locale={locale} className="text-primary hover:underline">{copy.trackingLink}</Link></li>
            <li><Link href="/responsible-gambling" locale={locale} className="text-primary hover:underline">{copy.responsibleLink}</Link></li>
          </ul>
        </section>
      </div>
    </article>
  </>;
}
