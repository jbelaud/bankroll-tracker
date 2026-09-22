import type { Plan } from "@prisma/client";
import { AppNav, AppTopBar } from "@/components/app-nav";
import { ResponsibleGamblingFooter } from "@/components/responsible-gambling-footer";

export function AppShell({
  children,
  plan,
  currentPeriodEnd,
  isAdmin,
}: Readonly<{
  children: React.ReactNode;
  plan: Plan;
  currentPeriodEnd: Date | null;
  isAdmin: boolean;
}>) {
  return (
    <div className="min-h-dvh w-full">
      <AppNav plan={plan} currentPeriodEnd={currentPeriodEnd} isAdmin={isAdmin} />
      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
        <AppTopBar />
        <main className="flex min-w-0 flex-1 flex-col px-4 pt-4 pb-[calc(8rem+var(--rg-footer-h))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-[calc(2rem+var(--rg-footer-h))] xl:px-10">
          <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
      <ResponsibleGamblingFooter />
    </div>
  );
}
