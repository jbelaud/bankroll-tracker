import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AppShell } from "@/components/app-shell";

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

  return <AppShell
    plan={dbUser?.plan ?? "FREE"}
    currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null}
    isAdmin={isAdminEmail(user.email)}
  >
    {children}
  </AppShell>;
}
