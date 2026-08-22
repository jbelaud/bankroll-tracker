import type { Locale } from "@/i18n/routing";
import { LegalPage } from "@/components/legal-page";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <MarketingLayout locale={locale}><LegalPage locale={locale} kind="terms" /></MarketingLayout>;
}
