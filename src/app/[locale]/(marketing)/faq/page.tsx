import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { FaqPage } from "@/components/marketing/faq-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.meta.faq" });
  return marketingMetadata({ locale, path: "/faq", title: t("title"), description: t("description") });
}

export default async function FaqRoute({ params }: { params: Promise<{ locale: Locale }> }) {
  return <FaqPage locale={(await params).locale} />;
}
