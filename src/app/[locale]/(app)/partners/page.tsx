import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMemberPartnerOffers } from "@/lib/partners/access";
import { MemberPartnersPage } from "@/components/partners/member-partners-page";
import { requireUser } from "@/lib/auth";
import { listMemberPartnerClaims } from "@/lib/partners/claims";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partners.member");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const partners = await getMemberPartnerOffers(locale);
  const user = await requireUser();
  const claims = await listMemberPartnerClaims(user.id);
  return <MemberPartnersPage partners={partners} claims={claims} />;
}
