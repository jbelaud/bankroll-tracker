import { AppNav } from "@/components/app-nav";
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* pb réserve la place de la nav + du footer jeu responsable + safe-area */}
      <main className="flex flex-1 flex-col px-4 pt-4 pb-[calc(7rem+var(--rg-footer-h))]">
        {children}
      </main>
      <AppNav />
      <ResponsibleGamblingFooter />
    </div>
  );
}
