import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { aboutCopy } from "@/lib/marketing/about-copy";
import { marketingMetadata } from "@/lib/marketing-seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const page = aboutCopy[locale === "en" ? "en" : "fr"];
  return marketingMetadata({ locale, path: "/about", title: page.metaTitle, description: page.metaDescription });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const page = aboutCopy[locale === "en" ? "en" : "fr"];

  return (
    <article className="py-12 sm:py-20 lg:py-24">
      <div className="kalivoa-content-frame max-w-3xl">
        <p className="marketing-eyebrow">{page.eyebrow}</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{page.title}</h1>
        <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">{page.intro}</p>
        {page.sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{section.body}</p>
          </section>
        ))}
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={page.eyebrow}>
          <Link href="/contact" locale={locale} className="marketing-text-link">{page.links.contact}</Link>
          <Link href="/legal-notice" locale={locale} className="marketing-text-link">{page.links.legal}</Link>
          <Link href="/privacy" locale={locale} className="marketing-text-link">{page.links.privacy}</Link>
        </nav>
      </div>
    </article>
  );
}
