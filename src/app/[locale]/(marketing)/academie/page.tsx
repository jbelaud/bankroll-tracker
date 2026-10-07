import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { academyArticlePath, academyContent } from "@/lib/academy-content";
import { marketingMetadata } from "@/lib/marketing-seo";
import { getSiteUrlForPath } from "@/lib/site";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = academyContent[locale].hub;
  return marketingMetadata({ locale, path: "/academie", title, description });
}

export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  const copy = academyContent[locale];
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kalivoa", item: getSiteUrlForPath(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: copy.hub.title, item: getSiteUrlForPath(`/${locale}/academie`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="kalivoa-content-frame py-12 sm:py-20">
        <nav aria-label={locale === "fr" ? "Fil d'Ariane" : "Breadcrumb"} className="text-sm text-muted-foreground">
          <Link href="/" locale={locale} className="hover:text-foreground">Kalivoa</Link>
          <span aria-hidden className="px-2">/</span>
          <span aria-current="page">{copy.hub.title}</span>
        </nav>

        <header className="mt-10 max-w-3xl">
          <p className="marketing-eyebrow">{copy.hub.eyebrow}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.hub.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{copy.hub.description}</p>
        </header>

        <section aria-labelledby="academy-intro" className="mt-14 max-w-3xl">
          <h2 id="academy-intro" className="text-2xl font-semibold tracking-tight">{copy.hub.introTitle}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{copy.hub.intro}</p>
        </section>

        <section aria-label={locale === "fr" ? "Articles de l'Académie" : "Academy articles"} className="mt-8 max-w-3xl">
          <article className="marketing-card p-6 sm:p-8">
            <p className="marketing-eyebrow">{copy.hub.articleLabel}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              <Link href={academyArticlePath} locale={locale} className="hover:text-primary">{copy.article.title}</Link>
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">{copy.hub.articleSummary}</p>
            <Link href={academyArticlePath} locale={locale} className="mt-5 inline-flex font-semibold text-primary hover:underline">
              {copy.hub.readArticle} →
            </Link>
          </article>
        </section>
      </div>
    </>
  );
}
