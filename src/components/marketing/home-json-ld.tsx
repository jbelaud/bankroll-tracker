import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getSiteUrlForPath } from "@/lib/site";

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

export async function HomeJsonLd({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const text = (key: string) => t(key as never);
  const localePath = "/" + locale;
  const homeUrl = getSiteUrlForPath(localePath);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Kalivoa",
      url: homeUrl,
      description: t("structured.organizationDescription"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Kalivoa",
      url: homeUrl,
      inLanguage: locale,
      description: t("structured.websiteDescription"),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Kalivoa",
      applicationCategory: "SportsApplication",
      url: homeUrl,
      inLanguage: locale,
      description: t("structured.applicationDescription"),
    },
    {
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
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
