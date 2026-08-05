import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function formatUsd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatTokens(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAdmin();
  const { locale } = await params;
  const t = await getTranslations("admin");
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [users, premiumUsers, totalUsage, recentUsage, scans] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "PREMIUM" } }),
    prisma.scanUsage.aggregate({
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
    }),
    prisma.scanUsage.aggregate({
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { costUsd: true },
    }),
    prisma.scanUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { user: { select: { email: true, plan: true } } },
    }),
  ]);

  const totalInputTokens = totalUsage._sum.inputTokens ?? 0;
  const totalOutputTokens = totalUsage._sum.outputTokens ?? 0;
  const totalCost = totalUsage._sum.costUsd ?? 0;
  const recentCost = recentUsage._sum.costUsd ?? 0;

  const cards = [
    { label: t("users"), value: String(users), detail: t("premiumUsers", { count: premiumUsers }) },
    {
      label: t("totalScans"),
      value: formatTokens(totalUsage._count, locale),
      detail: t("last30Days", { count: recentUsage._count }),
    },
    { label: t("totalCost"), value: formatUsd(totalCost, locale), detail: t("last30Cost", { amount: formatUsd(recentCost, locale) }) },
    {
      label: t("tokens"),
      value: formatTokens(totalInputTokens + totalOutputTokens, locale),
      detail: t("tokensDetail", {
        input: formatTokens(totalInputTokens, locale),
        output: formatTokens(totalOutputTokens, locale),
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <section key={card.label} className="glass-card flex flex-col gap-1 rounded-xl p-3">
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <strong className="num text-lg">{card.value}</strong>
            <span className="text-[0.65rem] text-muted-foreground">{card.detail}</span>
          </section>
        ))}
      </div>

      <section className="glass-card overflow-hidden rounded-xl">
        <div className="border-b border-border p-3">
          <h2 className="text-sm font-semibold">{t("recentScans")}</h2>
        </div>
        {scans.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("noData")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {scans.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{scan.user.email}</p>
                  <p className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(scan.createdAt)}
                    {` · ${scan.user.plan}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num font-medium">{formatUsd(scan.costUsd, locale)}</p>
                  <p className="num text-muted-foreground">
                    {formatTokens(scan.inputTokens + scan.outputTokens, locale)} {t("tokensShort")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
