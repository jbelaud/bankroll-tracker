import type { Currency } from "@prisma/client";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { personalStake } from "@/lib/bankroll-units";
import { fmtMoney } from "@/lib/format";

type PersonalConversion = {
  referenceCapital: number;
  unitPercent: number;
  rounding: number;
} | null;

export async function PersonalConversionCard({
  conversion,
  currency,
}: {
  conversion: PersonalConversion;
  currency: Currency;
}) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.personalConversion"),
  ]);
  const oneUnit = conversion
    ? personalStake(
        1,
        conversion.referenceCapital,
        conversion.unitPercent,
        conversion.rounding
      ).rounded
    : null;

  return (
    <section
      aria-labelledby="dashboard-personal-conversion-title"
      className="glass-card flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wallet size={19} weight="fill" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-personal-conversion-title"
              className="text-sm font-semibold"
            >
              {t("title")}
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              {t("privateBadge")}
            </span>
          </div>
          {conversion && oneUnit !== null ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                {t("reference", {
                  amount: fmtMoney(conversion.referenceCapital, locale, currency),
                })}
              </strong>
              <span aria-hidden> · </span>
              {t("oneUnit", { amount: fmtMoney(oneUnit, locale, currency) })}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("missing")}
            </p>
          )}
        </div>
      </div>

      <Link
        href="/account#personal-conversion"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {conversion ? t("edit") : t("configure")}
      </Link>
    </section>
  );
}
