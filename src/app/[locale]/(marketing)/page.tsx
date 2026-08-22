import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { MarketingHome } from "@/components/marketing/marketing-home";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.meta.home" });
  return marketingMetadata({ locale, title: t("title"), description: t("description") });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return <MarketingHome locale={(await params).locale} />;
}
