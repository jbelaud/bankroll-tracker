import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { MarketingFooter } from "./marketing-footer";
import { MarketingHeader } from "./marketing-header";

export async function MarketingLayout({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <MarketingHeader locale={locale} />
      <main className="flex-1">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
