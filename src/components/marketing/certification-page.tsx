import { ArrowRight, House, LockSimple, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { certificationCopy } from "@/lib/marketing/certification-copy";
import { getSiteUrlForPath } from "@/lib/site";
import { ProofJourney } from "./certification-overview";

const levelTones = {
  complete: "border-profit/25 bg-profit/10 text-profit",
  partial: "border-primary/25 bg-primary/10 text-primary",
  limited: "border-warning/25 bg-warning/10 text-warning",
  none: "border-border bg-muted text-muted-foreground",
};

export function CertificationPage({ locale }: { locale: Locale }) {
  const copy = certificationCopy[locale];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "WebPage", name: copy.metadataTitle,
    description: copy.metadataDescription, inLanguage: locale, url: getSiteUrlForPath(`/${locale}/certification`),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />
    <article className="pb-16 sm:pb-24">
      <div className="kalivoa-content-frame pt-10 sm:pt-14">
        <nav aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground"><House size={14} aria-hidden />{copy.home}</Link><span aria-hidden>/</span><span aria-current="page">Certification</span>
        </nav>
        <header className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="marketing-eyebrow"><ShieldCheck size={18} weight="fill" aria-hidden />{copy.eyebrow}</p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.title}</h1>
            <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">{copy.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" locale={locale} className="marketing-primary-cta">{copy.signup}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
              <a href="#proof-levels" className="marketing-secondary-cta">{locale === "fr" ? "Lire les niveaux de preuve" : "Read the evidence levels"}</a>
            </div>
          </div>
          <ProofJourney locale={locale} />
        </header>
        <section id="proof-levels" className="scroll-mt-24 border-t border-border py-10 sm:py-14" aria-labelledby="proof-levels-title">
          <h2 id="proof-levels-title" className="max-w-3xl text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{copy.levelsTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{copy.levelsDescription}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {copy.levels.map((level) => <li key={level.title} className="marketing-card p-5 sm:p-6">
              <h3 className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${levelTones[level.tone]}`}>{level.title}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{level.description}</p>
            </li>)}
            <li className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground sm:p-6">{copy.pending}</li>
          </ul>
        </section>
        <section className="marketing-solution rounded-3xl p-6 sm:p-8" aria-labelledby="evidence-score-title">
          <p className="marketing-eyebrow">{copy.readingTitle}</p>
          <h2 id="evidence-score-title" className="mt-3 text-2xl font-semibold tracking-tight">{copy.summary}</h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-muted-foreground">{copy.summaryDescription}</p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{copy.readingDescription}</p>
        </section>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="marketing-card p-6 sm:p-8"><ShieldCheck size={25} className="text-primary" aria-hidden /><h2 className="mt-4 text-xl font-semibold">{copy.startTitle}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.startDescription}</p></section>
          <section className="marketing-card p-6 sm:p-8"><LockSimple size={25} className="text-primary" aria-hidden /><h2 className="mt-4 text-xl font-semibold">{copy.sharingTitle}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.sharingDescription}</p></section>
        </div>
        <section className="mt-10 rounded-2xl border border-border p-5 sm:p-7"><h2 className="text-base font-semibold">{copy.scopeTitle}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.scopeDescription}</p></section>
        <section className="py-12 sm:py-16" aria-labelledby="certification-faq-title">
          <h2 id="certification-faq-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.faqTitle}</h2>
          <div className="mt-6 grid items-start gap-3 md:grid-cols-2">{copy.faq.map((item) => <details key={item.question} className="group marketing-card px-5 py-4">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">{item.question}<span className="text-2xl text-primary transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="pt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>)}</div>
        </section>
        <section className="marketing-solution p-6 text-center sm:p-10"><h2 className="text-balance text-2xl font-semibold sm:text-3xl">{copy.finalTitle}</h2><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{copy.finalDescription}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" locale={locale} className="marketing-primary-cta">{copy.signup}<ArrowRight size={18} aria-hidden /></Link><Link href="/pricing" locale={locale} className="marketing-secondary-cta">{copy.pricing}</Link></div></section>
      </div>
    </article>
  </>;
}
