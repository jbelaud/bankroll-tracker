import { ArrowRight, House, Lifebuoy } from "@phosphor-icons/react/dist/ssr";
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
      <article className="py-12 sm:py-20 lg:py-24">
        <div className="kalivoa-content-frame max-w-5xl">
          <nav aria-label={t("info.breadcrumbAriaLabel")} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground">
              <House size={14} aria-hidden />
              {t("info.home")}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page">{t("faq.title")}</span>
          </nav>
          <header className="mt-7 max-w-3xl sm:mt-10">
            <p className="marketing-eyebrow">{t("faq.eyebrow")}</p>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{t("faq.title")}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">{t("faq.description")}</p>
            <div className="mt-7 flex flex-wrap gap-2 text-sm">
              <Link href="/screenshot-import" locale={locale} className="rounded-full border border-border px-3 py-2 font-medium hover:bg-muted">{locale === "fr" ? "Import par capture" : "Screenshot import"}</Link>
              <Link href="/bookmakers" locale={locale} className="rounded-full border border-border px-3 py-2 font-medium hover:bg-muted">{locale === "fr" ? "Bookmakers compatibles" : "Compatible bookmakers"}</Link>
              <Link href="/pricing" locale={locale} className="rounded-full border border-border px-3 py-2 font-medium hover:bg-muted">{locale === "fr" ? "Tarifs" : "Pricing"}</Link>
            </div>
          </header>
          <section className="mt-10 grid gap-3 md:grid-cols-2">
            {faqKeys.map((key) => (
              <details key={key} className="group marketing-card self-start px-5 py-4 sm:px-6">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base [&::-webkit-details-marker]:hidden">
                   {text("faq.items." + key + ".question")}
                  <span className="text-2xl text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                 <p className="pt-3 text-sm leading-7 text-muted-foreground">{text("faq.items." + key + ".answer")}</p>
              </details>
            ))}
          </section>
          <section className="marketing-solution mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div><div className="flex items-center gap-2"><Lifebuoy size={21} className="text-primary" weight="duotone" aria-hidden /><h2 className="font-semibold">{locale === "fr" ? "Vous ne trouvez pas votre réponse ?" : "Can't find your answer?"}</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{locale === "fr" ? "Contactez-nous depuis votre compte : le contexte de la page sera joint à votre demande." : "Contact us from your account: the current page context will be attached to your request."}</p></div>
            <Link href="/contact" locale={locale} className="marketing-primary-cta shrink-0">{locale === "fr" ? "Contacter Kalivoa" : "Contact Kalivoa"}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
          </section>
        </div>
      </article>
    </>
  );
}
