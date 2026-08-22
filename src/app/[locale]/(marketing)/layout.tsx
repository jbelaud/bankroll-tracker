import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MarketingLayout locale={locale as Locale}>{children}</MarketingLayout>;
}
