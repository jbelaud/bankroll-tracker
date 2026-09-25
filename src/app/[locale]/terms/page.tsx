import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { LegalPage } from "@/components/legal-page";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { publicAlternates } from "@/lib/marketing-seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: publicAlternates(locale, "/terms") };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <MarketingLayout locale={locale}><LegalPage locale={locale} kind="terms" /></MarketingLayout>;
}
