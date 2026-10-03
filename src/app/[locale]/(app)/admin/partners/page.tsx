import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminPartnerClaims } from "@/lib/partners/claims";
import { partnerEmailsConfigured } from "@/lib/partners/reward-emails";
import type { ClaimStatus } from "@/lib/partners/claims-types";
import { PartnerReferralManager } from "@/components/admin/partner-referral-manager";
import { PartnerReferralAlert } from "@/components/admin/partner-referral-alert";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };
const statuses = ["PENDING", "NEEDS_INFO", "APPROVED", "REJECTED", "ALL"] as const;

export default async function PartnerAdminPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const [{ locale }, search, t] = await Promise.all([params, searchParams, getTranslations("partnerReferrals")]);
  const status = statuses.includes(search.status as ClaimStatus | "ALL") ? search.status as ClaimStatus | "ALL" : "PENDING";
  const parsedPage = Number(search.page ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 10_000 ? parsedPage : 1;
  const data = await getAdminPartnerClaims(status, page);
  return <div className="space-y-5">
    <header><Link href="/admin" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">{t("admin.back")}</Link><h1 className="text-2xl font-semibold">{t("admin.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("admin.description")}</p></header>
    <PartnerReferralAlert key={data.pendingCount} initialCount={data.pendingCount} refreshOnChange />
    {!partnerEmailsConfigured() && <p className="rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs leading-6 text-muted-foreground">{t("admin.emailSetup")}</p>}
    <nav aria-label={t("admin.filterLabel")} className="flex flex-wrap gap-2">{statuses.map((item) => <Link key={item} href={`/admin/partners?status=${item}`} aria-current={status === item ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-semibold ${status === item ? "border-primary/25 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{t(item === "ALL" ? "admin.all" : `statuses.${item}`)}</Link>)}</nav>
    <PartnerReferralManager claims={data.claims} locale={locale} />
    <nav aria-label={t("admin.pagination")} className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? <Link href={`/admin/partners?status=${status}&page=${page - 1}`} className="inline-flex min-h-11 items-center text-primary">{t("admin.previous")}</Link> : <span />}
      <span className="text-xs text-muted-foreground">{t("admin.page", { page, count: data.total })}</span>
      {page * 20 < data.total ? <Link href={`/admin/partners?status=${status}&page=${page + 1}`} className="inline-flex min-h-11 items-center text-primary">{t("admin.next")}</Link> : <span />}
    </nav>
  </div>;
}
