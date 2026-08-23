import { getTranslations } from "next-intl/server";
import { Crown, LockKey, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

export async function PremiumInsightsCard() {
  const t = await getTranslations("stats.insights");

  return (
    <section
      aria-label={t("ariaLabel")}
      className="glass-card relative min-h-64 overflow-hidden rounded-xl"
    >
      <div aria-hidden className="pointer-events-none select-none p-4 opacity-55 blur-[6px]">
        <div className="flex items-center gap-2">
          <Sparkle size={16} className="text-primary" weight="fill" />
          <span className="text-sm font-semibold">{t("title")}</span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-3 w-3/4 rounded bg-foreground/18" />
          <div className="h-3 w-11/12 rounded bg-foreground/12" />
          <div className="h-3 w-2/3 rounded bg-foreground/12" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {["profit", "warning", "primary"].map((tone) => (
            <div key={tone} className="h-20 rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/55 px-5 text-center backdrop-blur-[1px] sm:px-8">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <LockKey size={19} weight="fill" aria-hidden />
        </span>
        <p className="mt-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          <Crown size={14} weight="fill" aria-hidden />
          {t("premiumEyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{t("premiumTitle")}</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("premiumDescription")}</p>
        <Link
          href="/account"
          className="mt-5 inline-flex min-h-touch items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Crown size={17} weight="fill" aria-hidden />
          {t("premiumCta")}
        </Link>
      </div>
    </section>
  );
}
