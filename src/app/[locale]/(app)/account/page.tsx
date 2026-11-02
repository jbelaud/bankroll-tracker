import { getTranslations } from "next-intl/server";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PlanStatusSummary } from "@/components/account/plan-status-summary";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [dbUser, t] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, subscriptionCurrentPeriodEnd: true, publicDisplayName: true },
    }),
    getTranslations("account"),
  ]);

  const rows = [
    { href: "/account/profile", label: t("navigation.profile"), detail: user.email ?? "" },
    { href: "/account/tracking", label: t("navigation.tracking"), detail: t("navigation.trackingDetail") },
    { href: "/account/public-profile", label: t("navigation.public"), detail: dbUser?.publicDisplayName || t("navigation.publicEmpty") },
    { href: "/account/data", label: t("navigation.data"), detail: t("navigation.dataDetail") },
  ];

  return (
    <div className="min-w-0 space-y-7">
      <header>
        <p className="text-xs font-medium text-primary">{t("title")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("navigation.overview")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("navigation.overviewIntro")}</p>
      </header>

      <div className="flex min-w-0 items-center gap-3 border-b border-border pb-5">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">{user.email?.charAt(0).toUpperCase() || "?"}</span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("connectedAs")}</p>
          <p className="truncate text-sm font-semibold">{user.email}</p>
        </div>
      </div>

      <Link href="/account/subscription" className="group flex min-w-0 items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4 transition-colors hover:bg-primary/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="min-w-0 flex-1"><PlanStatusSummary plan={dbUser?.plan ?? "FREE"} currentPeriodEnd={dbUser?.subscriptionCurrentPeriodEnd ?? null} variant="overview" /></div>
        <ArrowRightIcon size={18} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>

      <section aria-labelledby="settings-title">
        <h2 id="settings-title" className="mb-2 text-sm font-semibold">{t("navigation.essential")}</h2>
        <div className="divide-y divide-border border-y border-border">
          {rows.map((row) => (
            <Link key={row.href} href={row.href} className="group flex min-h-16 min-w-0 items-center gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-w-0 flex-1 text-sm font-medium">{row.label}</span>
              <span className="max-w-[45%] truncate text-right text-xs text-muted-foreground group-hover:text-primary sm:text-sm">{row.detail}</span>
              <ArrowRightIcon size={16} className="shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
      <Link href="/account/help" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline lg:hidden">{t("navigation.help")}</Link>
    </div>
  );
}
