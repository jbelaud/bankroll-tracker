import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { getPartnerPreviews } from "@/lib/partners/catalogue";
import { PartnersPage } from "@/components/marketing/partners-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partners.meta" });
  return marketingMetadata({ locale, path: "/partenaires", title: t("title"), description: t("description") });
}

export default async function Page() {
  // Recalculer les échéances à chaque requête, y compris après un déploiement.
  await connection();
  return <PartnersPage partners={getPartnerPreviews()} />;
}
