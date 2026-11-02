import { ArrowRight, House, Info, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { documents } from "@/lib/legal/marketing-documents";

type Kind = "legal" | "sales";

function LinkedParagraph({ text }: { text: string }) {
  return <>{text.split(/(https:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g).map((part, index) => {
    const url = part.startsWith("https://");
    const email = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part);
    if (!url && !email) return part;
    const clean = url ? part.replace(/[.,;]+$/, "") : part;
    return <span key={index}><a href={url ? clean : `mailto:${clean}`} className="break-words underline underline-offset-4 hover:text-foreground" {...(url ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{clean}</a>{part.slice(clean.length)}</span>;
  })}</>;
}

export function MarketingDocumentPage({ locale, kind }: { locale: Locale; kind: Kind }) {
  const page = documents[kind][locale === "en" ? "en" : "fr"];
  const primaryHref = kind === "legal" ? "/privacy" : "/pricing";

  return (
    <article className="py-12 sm:py-20 lg:py-24">
      <div className="kalivoa-content-frame max-w-5xl">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground"><House size={14} aria-hidden />{page.home}</Link>
          <span aria-hidden>/</span><span aria-current="page" className="truncate">{page.eyebrow}</span>
        </nav>

        <header className="mt-7 max-w-3xl sm:mt-10">
          <p className="marketing-eyebrow"><Info size={16} weight="fill" aria-hidden />{page.eyebrow}</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">{page.intro}</p>
          <p className="mt-5 text-xs font-medium text-muted-foreground">{page.updated}</p>
        </header>

        <div role="note" className="mt-8 flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 sm:p-5">
          <Info size={22} className="mt-0.5 shrink-0 text-primary" weight="fill" aria-hidden />
          <p>{page.status}</p>
        </div>
        {kind === "sales" && <a href={`/downloads/cgv-kalivoa-${locale === "en" ? "en" : "fr"}-2026-10-22.txt`} download className="marketing-secondary-cta mt-5 inline-flex"><DownloadSimple size={18} aria-hidden />{locale === "en" ? "Download these terms" : "Télécharger ces CGV"}</a>}

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={locale === "fr" ? "Sommaire" : "Contents"} className="hidden rounded-2xl border border-border bg-card/45 p-3 lg:sticky lg:top-24 lg:block">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{locale === "fr" ? "Sommaire" : "Contents"}</p>
            {page.sections.map((section) => <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-3 py-2 text-xs leading-5 text-muted-foreground hover:bg-muted hover:text-foreground">{section.title}</a>)}
          </nav>

          <div className="min-w-0 space-y-4">
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className={`scroll-mt-24 rounded-2xl border ${section.id === "guarantees" ? "border-foreground/50 bg-card" : "border-border bg-card/45"} p-5 sm:p-7`}>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-muted-foreground"><LinkedParagraph text={paragraph} /></p>)}
                  {kind === "sales" && section.id === "withdrawal" && <a href={`/downloads/formulaire-retractation-kalivoa-${locale === "en" ? "en" : "fr"}.txt`} download className="marketing-text-link inline-flex min-h-touch items-center text-sm">{locale === "en" ? "Download the withdrawal form" : "Télécharger le formulaire de rétractation"}</a>}
                  {kind === "sales" && section.id === "withdrawal" && <Link href="/retractation" className="marketing-text-link inline-flex min-h-touch items-center text-sm">{locale === "en" ? "Withdraw from my contract" : "Renoncer à mon contrat"}</Link>}
                </div>
              </section>
            ))}
            <aside className="rounded-2xl border border-border bg-muted/25 p-5 sm:p-6">
              <h2 className="text-sm font-semibold">{locale === "fr" ? "Sources et références" : "Sources and references"}</h2>
              <ul className="mt-3 space-y-2">
                {page.references.map((reference) => <li key={reference.href}><a href={reference.href} target="_blank" rel="noopener noreferrer" className="marketing-text-link text-sm">{reference.label}<ArrowRight size={15} aria-hidden /></a></li>)}
              </ul>
            </aside>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} locale={locale} className="marketing-primary-cta">{page.primary}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
          <Link href="/contact" locale={locale} className="marketing-secondary-cta">{page.secondary}</Link>
        </div>
      </div>
    </article>
  );
}
