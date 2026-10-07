import type { Metadata } from "next";
import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { academyArticlePath, academyContent } from "@/lib/academy-content";
import { marketingMetadata } from "@/lib/marketing-seo";
import { getSiteUrlForPath } from "@/lib/site";

type Props = { params: Promise<{ locale: Locale }> };

const imagePath = "/images/academie/relecture-ticket-pari-kalivoa.png";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = academyContent[locale].article;
  return marketingMetadata({ locale, path: academyArticlePath, title, description });
}

export default async function TicketReviewArticlePage({ params }: Props) {
  const { locale } = await params;
  const copy = academyContent[locale];
  const pageUrl = getSiteUrlForPath(`/${locale}${academyArticlePath}`);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: copy.article.title,
      description: copy.article.description,
      datePublished: "2026-10-07",
      dateModified: "2026-10-07",
      inLanguage: locale,
      image: getSiteUrlForPath(imagePath),
      mainEntityOfPage: pageUrl,
      author: { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) },
      publisher: { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Kalivoa", item: getSiteUrlForPath(`/${locale}`) },
        { "@type": "ListItem", position: 2, name: copy.hub.title, item: getSiteUrlForPath(`/${locale}/academie`) },
        { "@type": "ListItem", position: 3, name: copy.article.title, item: pageUrl },
      ],
    },
  ];

  return (
    <>
      {structuredData.map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
      <article className="kalivoa-content-frame py-12 sm:py-20">
        <nav aria-label={locale === "fr" ? "Fil d'Ariane" : "Breadcrumb"} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" locale={locale} className="hover:text-foreground">Kalivoa</Link>
          <span aria-hidden>/</span>
          <Link href="/academie" locale={locale} className="hover:text-foreground">{copy.hub.title}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="text-foreground">{copy.article.eyebrow}</span>
        </nav>

        <header className="mt-10 max-w-3xl">
          <p className="marketing-eyebrow">{copy.article.eyebrow}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.article.title}</h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.article.lead}</p>
        </header>

        <div className="mt-14 max-w-3xl space-y-14">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.article.whyTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.article.why}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.article.checklistTitle}</h2>
            <ol className="mt-6 space-y-4">
              {copy.article.steps.map((step, index) => (
                <li key={step.title} className="marketing-card flex gap-4 p-5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.article.exampleTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.article.example}</p>
            <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
              <Image src={imagePath} alt={copy.article.imageAlt} width={1151} height={738} sizes="(max-width: 768px) 100vw, 768px" className="h-auto w-full" />
              <figcaption className="px-5 py-4 text-xs leading-6 text-muted-foreground">{copy.article.imageCaption}</figcaption>
            </figure>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">{copy.article.troubleTitle}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{copy.article.trouble}</p>
          </section>

          <section className="marketing-solution p-6 sm:p-8">
            <h2 className="text-xl font-semibold">{copy.article.linksTitle}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6">
              <li><Link href="/screenshot-import" locale={locale} className="font-medium text-primary hover:underline">{copy.article.importLink}</Link></li>
              <li><Link href="/bankroll-tracking" locale={locale} className="font-medium text-primary hover:underline">{copy.article.bankrollLink}</Link></li>
              <li><Link href="/faq" locale={locale} className="font-medium text-primary hover:underline">{copy.article.faqLink}</Link></li>
              <li><Link href="/responsible-gambling" locale={locale} className="font-medium text-primary hover:underline">{copy.article.responsibleLink}</Link></li>
            </ul>
          </section>

          <Link href="/academie" locale={locale} className="inline-flex font-semibold text-primary hover:underline">← {copy.article.backToAcademy}</Link>
        </div>
      </article>
    </>
  );
}
