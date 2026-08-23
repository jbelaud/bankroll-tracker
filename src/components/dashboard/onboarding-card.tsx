import { getTranslations } from "next-intl/server";
import { ArrowSquareOutIcon, ChartBar, CheckCircle, DiscordLogoIcon, Scan, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

export async function OnboardingCard({
  hasBankroll,
  hasBet,
}: {
  hasBankroll: boolean;
  hasBet: boolean;
}) {
  const t = await getTranslations("dashboard.onboarding");
  const currentStep = hasBankroll ? 2 : 1;
  const action = hasBankroll
    ? { href: "/scan" as const, label: t("scanCta") }
    : { href: "/bankrolls?create=1", label: t("bankrollCta") };
  const steps = [
    { icon: Wallet, title: t("steps.bankroll.title"), description: t("steps.bankroll.description"), complete: hasBankroll },
    { icon: Scan, title: t("steps.scan.title"), description: t("steps.scan.description"), complete: hasBet },
    { icon: ChartBar, title: t("steps.stats.title"), description: t("steps.stats.description"), complete: false },
  ];
  const Title = hasBankroll ? "h2" : "h1";

  return (
    <section aria-label={t("ariaLabel")} className="overflow-hidden rounded-2xl border border-primary/35 bg-linear-to-br from-primary/16 via-background to-profit/10 p-4 sm:p-6 lg:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("eyebrow")}</p>
      <Title className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
        {hasBankroll ? t("secondTitle") : t("title")}
      </Title>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        {hasBankroll ? t("secondDescription") : t("description")}
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className={`relative flex min-w-0 items-start gap-3 rounded-xl border p-3 sm:flex-col sm:gap-2 sm:p-4 ${
                step.complete
                  ? "border-profit/25 bg-profit-muted/50"
                  : isCurrent
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-background/35 opacity-65"
              }`}
            >
              {index < steps.length - 1 && (
                <span aria-hidden className="absolute left-[calc(100%_-_0.5rem)] top-8 z-0 hidden h-px w-8 bg-border sm:block" />
              )}
              <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${step.complete ? "bg-profit text-background" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step.complete ? <CheckCircle size={18} weight="fill" aria-hidden /> : <Icon size={17} weight="bold" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("stepLabel", { count: stepNumber })}</p>
                <p className="mt-0.5 text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        href={action.href}
        className="mt-6 flex min-h-touch items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] sm:w-fit"
      >
        {action.label}
      </Link>

      <a
        href="https://discord.gg/aMc8jDAAx"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex min-h-touch items-center justify-between gap-3 rounded-xl border border-border bg-background/45 px-4 py-3 transition-colors hover:bg-muted/60"
      >
        <span className="flex items-center gap-3 text-left">
          <DiscordLogoIcon size={22} weight="fill" className="shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">{t("discord.title")}</span>
            <span className="block text-xs text-muted-foreground">{t("discord.description")}</span>
          </span>
        </span>
        <ArrowSquareOutIcon size={17} className="shrink-0 text-muted-foreground" aria-hidden />
      </a>
    </section>
  );
}
