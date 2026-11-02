import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { certificationCopy } from "@/lib/marketing/certification-copy";
import { CertificationPage } from "@/components/marketing/certification-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const copy = certificationCopy[locale];
  return marketingMetadata({ locale, path: "/certification", title: copy.metadataTitle, description: copy.metadataDescription });
}

export default async function CertificationRoute({ params }: { params: Promise<{ locale: Locale }> }) {
  return <CertificationPage locale={(await params).locale} />;
}
