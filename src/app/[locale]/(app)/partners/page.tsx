import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMemberPartnerOffers } from "@/lib/partners/access";
import { MemberPartnersPage } from "@/components/partners/member-partners-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partners.member");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const partners = await getMemberPartnerOffers(locale);
  return <MemberPartnersPage partners={partners} />;
}
