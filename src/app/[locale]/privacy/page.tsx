import type { Locale } from "@/i18n/routing";
import { LegalPage } from "@/components/legal-page";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  return <LegalPage locale={(await params).locale} kind="privacy" />;
}
