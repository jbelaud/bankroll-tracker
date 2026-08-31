import { AppNav, AppTopBar } from "@/components/app-nav";
import { ResponsibleGamblingFooter } from "@/components/responsible-gambling-footer";
import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale: localeInput } = await params;
  const locale = localeInput as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, subscriptionCurrentPeriodEnd: true },
  });

  return (
    <div className="min-h-dvh w-full">
      <AppNav
        plan={dbUser?.plan ?? "FREE"}
        currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null}
        isAdmin={isAdminEmail(user.email)}
      />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <AppTopBar />
        {/* Mobile : réserve nav + footer. Desktop : seule la bande responsable reste fixe. */}
        <main className="flex flex-1 flex-col px-4 pt-4 pb-[calc(8rem+var(--rg-footer-h))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-[calc(2rem+var(--rg-footer-h))] xl:px-10">
          <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
      <ResponsibleGamblingFooter />
    </div>
  );
}
