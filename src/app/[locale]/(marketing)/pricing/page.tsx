import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { MarketingInfoPage } from "@/components/marketing/marketing-info-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.meta.pricing" });
  return marketingMetadata({ locale, path: "/pricing", title: t("title"), description: t("description") });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  return <MarketingInfoPage locale={(await params).locale} page="pricing" />;
}
