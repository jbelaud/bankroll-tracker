import type { Plan } from "@prisma/client";
import { CaretLeft, CaretRight, MagnifyingGlass, Users } from "@phosphor-icons/react/ssr";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  subscriptionStatus: string | null;
  createdAt: string;
  lastActiveAt: string;
  bankrolls: number;
  bets: number;
  scans: number;
  acquisitionSource: string;
  acquisitionCampaign: string | null;
};

type AdminUserTableProps = {
  users: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  plan: Plan | "ALL";
  period: string;
  locale: string;
};

const KNOWN_SOURCES = ["direct", "google_seo", "reddit", "discord", "other_referral", "unknown"] as const;
type KnownSource = (typeof KNOWN_SOURCES)[number];

function queryHref({
  page,
  period,
  query,
  plan,
}: Pick<AdminUserTableProps, "period" | "query" | "plan"> & { page: number }) {
  const search = new URLSearchParams({ period, userPage: String(page) });
  if (query) search.set("q", query);
  if (plan !== "ALL") search.set("plan", plan);
  return `?${search.toString()}#users`;
}

function sourceTone(source: string) {
  if (source === "direct") return "bg-muted text-muted-foreground";
  if (source === "unknown") return "border border-border text-muted-foreground";
  return "bg-primary/12 text-primary";
}

function planTone(plan: Plan) {
  if (plan === "PREMIUM") return "bg-profit-muted text-profit";
  if (plan === "BETA_PREMIUM") return "bg-primary/15 text-primary";
  if (plan === "BETA_TESTER") return "bg-warning-muted text-warning";
  return "bg-muted text-muted-foreground";
}

export async function AdminUserTable({
  users,
  total,
  page,
  totalPages,
  query,
  plan,
  period,
  locale,
}: AdminUserTableProps) {
  const t = await getTranslations("admin.users");
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sourceLabel = (source: string) => {
    return KNOWN_SOURCES.includes(source as KnownSource) ? t(`sources.${source as KnownSource}`) : source;
  };

  return (
    <section id="users" className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card/65 shadow-[0_24px_80px_oklch(0_0_0_/_18%)]">
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Users size={18} weight="bold" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">{t("title")}</h2>
              <p className="text-xs text-muted-foreground">{t("description", { count: total })}</p>
            </div>
          </div>
        </div>

        <form method="get" action="#users" className="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_10rem_auto] xl:w-auto">
          <input type="hidden" name="period" value={period} />
          <label className="relative">
            <span className="sr-only">{t("searchLabel")}</span>
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" size={16} aria-hidden />
            <input
              name="q"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full min-w-0 rounded-xl border border-input bg-background/70 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <label>
            <span className="sr-only">{t("planFilter")}</span>
            <select
              name="plan"
              defaultValue={plan}
              className="h-10 w-full rounded-xl border border-input bg-background/70 px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="ALL">{t("plans.ALL")}</option>
              <option value="FREE">{t("plans.FREE")}</option>
              <option value="BETA_TESTER">{t("plans.BETA_TESTER")}</option>
              <option value="BETA_PREMIUM">{t("plans.BETA_PREMIUM")}</option>
              <option value="PREMIUM">{t("plans.PREMIUM")}</option>
            </select>
          </label>
          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("filter")}
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users size={20} aria-hidden />
          </span>
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border lg:hidden">
            {users.map((user) => (
              <article key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name || user.email}</p>
                    {user.name ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-1 text-[0.65rem] font-semibold", planTone(user.plan))}>
                    {t(`plans.${user.plan}`)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-background/45 p-3 text-center">
                  <div><strong className="num block text-sm">{user.bankrolls}</strong><span className="text-[0.65rem] text-muted-foreground">{t("bankrolls")}</span></div>
                  <div><strong className="num block text-sm">{user.bets}</strong><span className="text-[0.65rem] text-muted-foreground">{t("bets")}</span></div>
                  <div><strong className="num block text-sm">{user.scans}</strong><span className="text-[0.65rem] text-muted-foreground">{t("scans")}</span></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[0.7rem] text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-1 font-medium", sourceTone(user.acquisitionSource))}>{sourceLabel(user.acquisitionSource)}</span>
                  <span>{t("lastActivityShort", { date: dateTimeFormat.format(new Date(user.lastActiveAt)) })}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[62rem] border-collapse text-left text-xs">
              <thead className="bg-background/45 text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">{t("user")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("acquisition")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("plan")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("bankrolls")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("bets")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t("scans")}</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">{t("lastActivity")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
                          {(user.name || user.email).slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate font-semibold text-foreground">{user.name || user.email}</span>
                          <span className="block max-w-56 truncate text-muted-foreground">{user.name ? user.email : t("joined", { date: dateFormat.format(new Date(user.createdAt)) })}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex rounded-full px-2 py-1 font-semibold", sourceTone(user.acquisitionSource))}>
                        {sourceLabel(user.acquisitionSource)}
                      </span>
                      {user.acquisitionCampaign ? <span className="mt-1 block max-w-40 truncate text-[0.65rem] text-muted-foreground">{user.acquisitionCampaign}</span> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex rounded-full px-2 py-1 font-semibold", planTone(user.plan))}>
                        {t(`plans.${user.plan}`)}
                      </span>
                      {user.subscriptionStatus ? <span className="mt-1 block text-[0.65rem] text-muted-foreground">{user.subscriptionStatus}</span> : null}
                    </td>
                    <td className="num px-4 py-4 text-right font-medium">{user.bankrolls}</td>
                    <td className="num px-4 py-4 text-right font-medium">{user.bets}</td>
                    <td className="num px-4 py-4 text-right font-medium">{user.scans}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="block font-medium">{dateTimeFormat.format(new Date(user.lastActiveAt))}</span>
                      <span className="text-[0.65rem] text-muted-foreground">{t("joined", { date: dateFormat.format(new Date(user.createdAt)) })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <footer className="flex flex-col gap-3 border-t border-border bg-background/25 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>{t("pageSummary", { page, pages: totalPages, total })}</span>
        <nav aria-label={t("pagination")} className="flex items-center gap-2">
          <a
            href={queryHref({ page: Math.max(1, page - 1), period, query, plan })}
            aria-disabled={page <= 1}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 font-medium text-foreground transition-colors hover:bg-muted",
              page <= 1 && "pointer-events-none opacity-40"
            )}
          >
            <CaretLeft size={14} aria-hidden />
            {t("previous")}
          </a>
          <a
            href={queryHref({ page: Math.min(totalPages, page + 1), period, query, plan })}
            aria-disabled={page >= totalPages}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 font-medium text-foreground transition-colors hover:bg-muted",
              page >= totalPages && "pointer-events-none opacity-40"
            )}
          >
            {t("next")}
            <CaretRight size={14} aria-hidden />
          </a>
        </nav>
      </footer>
    </section>
  );
}
