import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSiteUrlForPath } from "@/lib/site";

export type LearningArticle = {
  title: string; description: string; category: string; lead: string;
  sections: { title: string; paragraphs: string[]; table?: string[][] }[];
  source: string; citation?: string;
};

export function AcademyLearningArticle({ locale, path, copy }: { locale: Locale; path: string; copy: LearningArticle }) {
  const fr = locale === "fr";
  const url = getSiteUrlForPath(`/${locale}${path}`);
  const organization = { "@type": "Organization", name: "Kalivoa", url: getSiteUrlForPath(`/${locale}`) };
  const schemas = [
    { "@context": "https://schema.org", "@type": "Article", headline: copy.title, description: copy.description,
      datePublished: "2026-10-08", dateModified: "2026-10-08", mainEntityOfPage: url, inLanguage: locale,
      author: organization, publisher: organization, ...(copy.citation ? { citation: copy.citation } : {}) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kalivoa", item: getSiteUrlForPath(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: fr ? "Académie Kalivoa" : "Kalivoa Academy", item: getSiteUrlForPath(`/${locale}/academie`) },
      { "@type": "ListItem", position: 3, name: copy.title, item: url },
    ] },
  ];
  return <>
    {schemas.map((schema) => <script key={schema["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />)}
    <article className="kalivoa-content-frame py-12 sm:py-20">
      <nav aria-label={fr ? "Fil d’Ariane" : "Breadcrumb"} className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/" locale={locale}>Kalivoa</Link><span aria-hidden>/</span>
        <Link href="/academie" locale={locale}>{fr ? "Académie Kalivoa" : "Kalivoa Academy"}</Link><span aria-hidden>/</span>
        <span aria-current="page">{copy.category}</span>
      </nav>
      <header className="mt-10 max-w-3xl">
        <p className="marketing-eyebrow">{copy.category}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{fr ? "Rédaction Kalivoa · " : "Kalivoa editorial team · "}<time dateTime="2026-10-08">{fr ? "8 octobre 2026" : "October 8, 2026"}</time></p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.lead}</p>
      </header>
      <div className="mt-14 max-w-3xl space-y-12">
        {copy.sections.map((section) => <section key={section.title}>
          <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 whitespace-pre-line leading-8 text-muted-foreground">{paragraph}</p>)}
          {section.table ? <div className="marketing-card mt-6 overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">{section.title}</caption>
            <thead><tr>{section.table[0].map((cell) => <th key={cell} scope="col" className="border-b border-border p-4 font-semibold">{cell}</th>)}</tr></thead>
            <tbody>{section.table.slice(1).map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row" className="border-b border-border p-4 font-medium">{cell}</th> : <td key={index} className="border-b border-border p-4 text-muted-foreground">{cell}</td>)}</tr>)}</tbody>
          </table></div> : null}
        </section>)}
        <aside className="marketing-solution p-6 sm:p-8" aria-label={fr ? "Source de l’exemple" : "Example source"}>
          <p className="text-sm leading-7 text-muted-foreground">{copy.source}</p>
          {copy.citation ? <a href={copy.citation} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">{fr ? "Consulter la bankroll publique source" : "View the source public bankroll"} ↗</a> : null}
        </aside>
        <section>
          <h2 className="text-xl font-semibold">{fr ? "Pour poursuivre" : "Keep exploring"}</h2>
          <ul className="mt-4 space-y-3 text-sm font-semibold text-primary">
            <li><Link href="/academie" locale={locale} className="hover:underline">{fr ? "Tous les articles de l’Académie" : "All Academy articles"}</Link></li>
            <li><Link href="/bankroll-tracking" locale={locale} className="hover:underline">{fr ? "Comprendre le suivi de bankroll" : "Understand bankroll tracking"}</Link></li>
            <li><Link href="/academie/verifier-paris-tipster" locale={locale} className="hover:underline">{fr ? "Lire les preuves d’un tipster" : "Read a tipster’s evidence"}</Link></li>
            <li><Link href="/responsible-gambling" locale={locale} className="hover:underline">{fr ? "Jeu responsable" : "Responsible gambling"}</Link></li>
          </ul>
        </section>
      </div>
    </article>
  </>;
}
