import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { LegalPage } from "@/components/legal-page";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { publicAlternates } from "@/lib/marketing-seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Privacy and personal data" : "Confidentialité et données personnelles",
    description: locale === "en" ? "Kalivoa account data, scans, billing, retention and your privacy rights." : "Données de compte, scans, facturation, conservation et droits sur tes données dans Kalivoa.",
    alternates: publicAlternates(locale, "/privacy"),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <MarketingLayout locale={locale}><LegalPage locale={locale} kind="privacy" /></MarketingLayout>;
}
