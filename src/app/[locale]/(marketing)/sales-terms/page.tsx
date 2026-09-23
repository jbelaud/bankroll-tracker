import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { MarketingDocumentPage } from "@/components/marketing/marketing-document-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.meta.sales" });
  return marketingMetadata({ locale, path: "/sales-terms", title: t("title"), description: t("description") });
}

export default async function SalesTermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  return <MarketingDocumentPage locale={(await params).locale} kind="sales" />;
}
