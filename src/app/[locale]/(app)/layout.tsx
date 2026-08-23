import { AppNav, AppTopBar } from "@/components/app-nav";
import { ResponsibleGamblingFooter } from "@/components/responsible-gambling-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh w-full">
      <AppNav />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <AppTopBar />
        {/* Mobile : réserve nav + footer. Desktop : seule la bande responsable reste fixe. */}
        <main className="flex flex-1 flex-col px-4 pt-4 pb-[calc(7rem+var(--rg-footer-h))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-[calc(2rem+var(--rg-footer-h))] xl:px-10">
          <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
      <ResponsibleGamblingFooter />
    </div>
  );
}
