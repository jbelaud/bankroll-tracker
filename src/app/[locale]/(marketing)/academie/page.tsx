import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { academyArticlePath, academyContent } from "@/lib/academy-content";
import { academyTipsterContent, academyTipsterPath } from "@/lib/academy-tipster-content";
import { academyCombinedContent, academyCombinedPath } from "@/lib/academy-combined-content";
import roiContent from "@/lib/academy-roi-content.json";
import drawdownContent from "@/lib/academy-drawdown-content.json";
import unitsContent from "@/lib/academy-units-content.json";
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
  const fr = locale === "fr";
  const articles = [
    { path: academyArticlePath, title: copy.article.title, summary: copy.hub.articleSummary, date: "2026-10-07", group: "history" },
    { path: academyCombinedPath, title: academyCombinedContent[locale].title, summary: fr ? "Une seule mise, plusieurs sélections : enregistrez un combiné sans créer de doublon." : "One stake, several selections: record an accumulator without duplicating the bet.", date: "2026-10-08", group: "history" },
    { path: academyTipsterPath, title: academyTipsterContent[locale].title, summary: copy.hub.tipsterSummary, date: "2026-10-08", group: "evidence" },
    { path: "/academie/comprendre-drawdown-bankroll", title: drawdownContent[locale].title, summary: drawdownContent[locale].description, date: "2026-10-08", group: "stats" },
    { path: "/academie/calculer-roi-paris", title: roiContent[locale].title, summary: roiContent[locale].description, date: "2026-10-08", group: "stats" },
    { path: "/academie/comprendre-unites-bankroll", title: unitsContent[locale].title, summary: unitsContent[locale].description, date: "2026-10-08", group: "evidence" },
  ];
  const groups = [
    { id: "history", title: fr ? "Tenir son historique" : "Keep your betting history", intro: fr ? "Contrôlez vos tickets et gardez une trace lisible de chaque pari." : "Check your slips and keep a clear record of each bet." },
    { id: "stats", title: fr ? "Comprendre ses statistiques" : "Understand your statistics", intro: fr ? "Reliez les indicateurs aux mises et aux résultats réellement enregistrés." : "Connect your statistics to the stakes and outcomes actually recorded." },
    { id: "evidence", title: fr ? "Lire les preuves d’un tipster" : "Read a tipster’s bet evidence", intro: fr ? "Comprenez ce qu’un historique public permet de vérifier et ses limites." : "Understand what a public history lets you check and its limits." },
  ];
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
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

        <section aria-labelledby="academy-start" className="mt-14">
          <h2 id="academy-start" className="text-2xl font-semibold tracking-tight">{fr ? "Commencer ici" : "Start here"}</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{fr ? "Du ticket à la bankroll publique, trois lectures pour apprendre à contrôler les informations." : "From a slip to a public bankroll, three articles to help you check the information."}</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {articles.slice(0, 3).map((article, index) => <li key={article.path} className="marketing-card p-6">
              <span className="text-sm font-semibold text-primary">{fr ? "Étape" : "Step"} {index + 1}</span>
              <Link href={article.path} locale={locale} className="mt-3 block font-semibold leading-7 hover:text-primary">{article.title}</Link>
            </li>)}
          </ol>
        </section>
        <nav aria-label={fr ? "Rubriques de l’Académie" : "Academy topics"} className="mt-10 flex flex-wrap gap-3 text-sm">
          {groups.map((group) => <a key={group.id} href={`#${group.id}`} className="rounded-full border border-border px-4 py-2 hover:text-primary">{group.title}</a>)}
          <a href="#kalivoa-tools" className="rounded-full border border-border px-4 py-2 hover:text-primary">{fr ? "Utiliser Kalivoa" : "Use Kalivoa"}</a>
        </nav>
        {groups.map((group) => <section key={group.id} aria-labelledby={group.id} className="mt-14 scroll-mt-24">
          <h2 id={group.id} className="text-2xl font-semibold tracking-tight">{group.title}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{group.intro}</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {articles.filter((article) => article.group === group.id).map((article) => <article key={article.path} className="marketing-card flex flex-col p-6 sm:p-8">
              <p className="text-xs text-muted-foreground">{fr ? "Rédaction Kalivoa" : "Kalivoa editorial team"} · <time dateTime={article.date}>{new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(article.date))}</time></p>
              <h3 className="mt-3 text-xl font-semibold leading-7"><Link href={article.path} locale={locale} className="hover:text-primary">{article.title}</Link></h3>
              <p className="mt-3 flex-1 leading-7 text-muted-foreground">{article.summary}</p>
              <p className="mt-4 text-xs text-muted-foreground">{fr ? "Avec un exemple réel daté" : "Includes a dated real example"}</p>
              <Link href={article.path} locale={locale} className="mt-5 font-semibold text-primary hover:underline">{copy.hub.readArticle} →</Link>
            </article>)}
          </div>
        </section>)}
        <section id="kalivoa-tools" aria-labelledby="academy-tools-title" className="marketing-solution mt-14 scroll-mt-24 p-6 sm:p-8">
          <h2 id="academy-tools-title" className="text-2xl font-semibold">{fr ? "Utiliser Kalivoa" : "Use Kalivoa"}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{fr ? "Retrouvez le parcours d’import et les réponses aux questions sur le fonctionnement de l’outil." : "Explore the import workflow and answers about how the tool works."}</p>
          <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-primary">
            <li><Link href="/screenshot-import" locale={locale} className="hover:underline">{copy.article.importLink}</Link></li>
            <li><Link href="/bankroll-tracking" locale={locale} className="hover:underline">{copy.article.bankrollLink}</Link></li>
            <li><Link href="/faq" locale={locale} className="hover:underline">{copy.article.faqLink}</Link></li>
          </ul>
        </section>
      </div>
    </>
  );
}
