import { ArrowRight, House } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

const faqKeys = [
  "what",
  "import",
  "completed",
  "bookmakers",
  "review",
  "credentials",
  "stats",
  "mobile",
  "pricing",
] as const;

export async function FaqPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const text = (key: string) => t(key as never);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((key) => ({
      "@type": "Question",
        name: text("faq.items." + key + ".question"),
      acceptedAnswer: {
        "@type": "Answer",
          text: text("faq.items." + key + ".answer"),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="marketing-section">
        <div className="marketing-container max-w-5xl">
          <nav aria-label={t("info.breadcrumbAriaLabel")} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground">
              <House size={14} aria-hidden />
              {t("info.home")}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page">{t("faq.title")}</span>
          </nav>
          <header className="mt-10 max-w-3xl">
            <p className="marketing-eyebrow">{t("faq.eyebrow")}</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{t("faq.title")}</h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{t("faq.description")}</p>
          </header>
          <section className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card/60 px-5 sm:px-7">
            {faqKeys.map((key) => (
              <details key={key} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                   {text("faq.items." + key + ".question")}
                  <span className="text-2xl text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                 <p className="max-w-3xl pt-4 text-sm leading-7 text-muted-foreground">{text("faq.items." + key + ".answer")}</p>
              </details>
            ))}
          </section>
          <Link href="/signup" locale={locale} className="marketing-primary-cta mt-10">
            {t("info.cta")}
            <ArrowRight size={18} weight="bold" aria-hidden />
          </Link>
        </div>
      </article>
    </>
  );
}
