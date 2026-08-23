import type { ComponentType } from "react";
import {
  ArrowRight,
  Camera,
  ChartLineUp,
  CheckCircle,
  DownloadSimple,
  ListChecks,
  LockSimple,
  PencilSimple,
  ShieldCheck,
  Sparkle,
  Stack,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { HomeJsonLd } from "./home-json-ld";

type Icon = ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill"; className?: string; "aria-hidden"?: boolean }>;

const featureItems: { key: "import" | "review" | "bankrolls" | "stats" | "formats" | "export"; icon: Icon }[] = [
  { key: "import", icon: Camera },
  { key: "review", icon: PencilSimple },
  { key: "bankrolls", icon: Stack },
  { key: "stats", icon: ChartLineUp },
  { key: "formats", icon: ListChecks },
  { key: "export", icon: DownloadSimple },
];

const stepItems: { key: "upload" | "review" | "analyze"; icon: Icon }[] = [
  { key: "upload", icon: Camera },
  { key: "review", icon: PencilSimple },
  { key: "analyze", icon: ChartLineUp },
];

const faqKeys = [
  "what",
  "import",
  "completed",
  "bookmakers",
  "review",
  "credentials",
  "stats",
  "mobile",
  "pricing",
] as const;

export async function MarketingHome({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const text = (key: string) => t(key as never);

  return (
    <>
      <HomeJsonLd locale={locale} />
      <section className="marketing-hero">
        <div className="marketing-container grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:py-24">
          <div className="max-w-2xl">
            <p className="marketing-eyebrow">
              <Sparkle size={15} weight="fill" aria-hidden />
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              {t("hero.description")}
            </p>
            <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
              {t("hero.ocrNote")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" locale={locale} className="marketing-primary-cta">
                {t("hero.primaryCta")}
                <ArrowRight size={18} weight="bold" aria-hidden />
              </Link>
              <a href="#product-demo" className="marketing-secondary-cta">
                {t("hero.secondaryCta")}
              </a>
            </div>
            <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-profit" weight="fill" aria-hidden />
                <span>{t("hero.reassuranceOne")}</span>
              </li>
              <li className="flex items-start gap-2">
                <LockSimple size={19} className="mt-0.5 shrink-0 text-primary" weight="fill" aria-hidden />
                <span>{t("hero.reassuranceTwo")}</span>
              </li>
            </ul>
          </div>
          <ProductPreview text={text} />
        </div>
      </section>

      <section className="border-y border-border bg-card/30">
        <div className="marketing-container grid gap-4 py-6 sm:grid-cols-3">
          {["trustOne", "trustTwo", "trustThree"].map((key) => (
            <p key={key} className="flex items-center justify-center gap-2 text-center text-sm font-medium text-muted-foreground">
              <CheckCircle size={18} className="shrink-0 text-profit" weight="fill" aria-hidden />
               {text("trust." + key)}
            </p>
          ))}
        </div>
      </section>

      <section id="features" className="marketing-section">
        <div className="marketing-container">
          <SectionIntro eyebrow={t("problem.eyebrow")} title={t("problem.title")} description={t("problem.description")} />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {["manual", "history", "visibility"].map((key) => (
              <article key={key} className="marketing-card p-6">
                 <p className="text-sm font-semibold text-primary">{text("problem.items." + key + ".number")}</p>
                 <h3 className="mt-5 text-lg font-semibold">{text("problem.items." + key + ".title")}</h3>
                 <p className="mt-3 text-sm leading-6 text-muted-foreground">{text("problem.items." + key + ".description")}</p>
              </article>
            ))}
          </div>
          <div className="marketing-solution mt-5 grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkle size={24} weight="fill" aria-hidden />
            </span>
            <div>
              <h3 className="text-xl font-semibold">{t("solution.title")}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("solution.description")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="marketing-section border-y border-border bg-card/20">
        <div className="marketing-container">
          <SectionIntro eyebrow={t("steps.eyebrow")} title={t("steps.title")} description={t("steps.description")} />
          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {stepItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="marketing-card relative overflow-hidden p-6 sm:p-7">
                  <span className="num text-xs font-bold text-primary">0{index + 1}</span>
                  <span className="mt-6 flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon size={22} weight="bold" aria-hidden />
                  </span>
                   <h3 className="mt-5 text-lg font-semibold">{text("steps.items." + item.key + ".title")}</h3>
                   <p className="mt-3 text-sm leading-6 text-muted-foreground">{text("steps.items." + item.key + ".description")}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <SectionIntro eyebrow={t("features.eyebrow")} title={t("features.title")} description={t("features.description")} />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.key} className="marketing-card group p-6">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon size={21} weight="bold" aria-hidden />
                  </span>
                   <h3 className="mt-5 text-base font-semibold">{text("features.items." + item.key + ".title")}</h3>
                   <p className="mt-2 text-sm leading-6 text-muted-foreground">{text("features.items." + item.key + ".description")}</p>
                </article>
              );
            })}
          </div>
          <Link href="/features" locale={locale} className="marketing-text-link mt-7">
            {t("features.more")}
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="marketing-section border-y border-border bg-card/20">
        <div className="marketing-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="marketing-eyebrow">{t("bookmakers.eyebrow")}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t("bookmakers.title")}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">{t("bookmakers.description")}</p>
            <Link href="/bookmakers" locale={locale} className="marketing-text-link mt-6">
              {t("bookmakers.more")}
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Winamax", "Betclic", "Unibet", "Bet365"].map((bookmaker) => (
              <div key={bookmaker} className="marketing-card flex min-h-28 items-center justify-center p-5 text-center text-lg font-semibold">
                {bookmaker}
              </div>
            ))}
            <p className="col-span-2 text-center text-xs leading-5 text-muted-foreground">{t("bookmakers.independence")}</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="marketing-section">
        <div className="marketing-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="marketing-eyebrow justify-center">{t("pricing.eyebrow")}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t("pricing.title")}</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{t("pricing.description")}</p>
          </div>
          <div className="marketing-card mx-auto mt-9 max-w-3xl p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h3 className="text-xl font-semibold">{t("pricing.cardTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("pricing.cardDescription")}</p>
              </div>
              <Link href="/pricing" locale={locale} className="marketing-secondary-cta justify-center">
                {t("pricing.cta")}
                <ArrowRight size={17} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="marketing-section border-y border-border bg-card/20">
        <div className="marketing-container grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="marketing-eyebrow">{t("faq.eyebrow")}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t("faq.title")}</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">{t("faq.description")}</p>
            <Link href="/faq" locale={locale} className="marketing-text-link mt-6">
              {t("faq.more")}
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card/60 px-5">
            {faqKeys.map((key) => (
              <details key={key} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                   {text("faq.items." + key + ".question")}
                  <span className="text-xl text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                 <p className="max-w-2xl pt-3 text-sm leading-6 text-muted-foreground">{text("faq.items." + key + ".answer")}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-final-cta overflow-hidden p-8 text-center sm:p-12">
            <Wallet size={28} className="mx-auto text-primary" weight="fill" aria-hidden />
            <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{t("finalCta.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">{t("finalCta.description")}</p>
            <Link href="/signup" locale={locale} className="marketing-primary-cta mx-auto mt-7">
              {t("finalCta.cta")}
              <ArrowRight size={18} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="marketing-eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h2>
      <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function ProductPreview({ text }: { text: (key: string) => string }) {
  return (
    <div id="product-demo" className="relative mx-auto w-full max-w-2xl scroll-mt-24">
      <div className="absolute -inset-8 -z-10 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="overflow-hidden rounded-[1.7rem] border border-white/12 bg-card/95 p-3 shadow-[0_30px_80px_oklch(0.02_0.01_260_/_60%)] sm:p-4">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-profit" aria-hidden />
            <span className="text-xs font-semibold">{text("preview.appName")}</span>
          </div>
          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[0.65rem] font-semibold text-primary">{text("preview.label")}</span>
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-[0.88fr_1.12fr]">
          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{text("preview.uploadLabel")}</p>
            <div className="mt-4 rounded-xl border border-dashed border-primary/45 bg-primary/7 p-4">
              <Camera size={23} className="text-primary" weight="bold" aria-hidden />
              <p className="mt-3 text-sm font-semibold">{text("preview.uploadTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{text("preview.uploadDescription")}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/55 p-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Camera size={14} weight="bold" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-foreground">{text("preview.selectedCount")}</span>
            </div>
            <p className="mt-3 text-[0.68rem] leading-4 text-muted-foreground">{text("preview.uploadHint")}</p>
          </article>
          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{text("preview.reviewLabel")}</p>
              <CheckCircle size={18} className="text-profit" weight="fill" aria-hidden />
            </div>
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{text("preview.completedBet")}</span>
                  <span className="rounded bg-profit-muted px-1.5 py-0.5 text-[0.6rem] font-semibold text-profit">{text("preview.won")}</span>
                </div>
                <p className="mt-1 text-[0.68rem] text-muted-foreground">{text("preview.completedFields")}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[0.62rem] text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-1">{text("preview.fieldDate")}</span>
                  <span className="rounded bg-muted px-1.5 py-1">{text("preview.fieldOdds")}</span>
                  <span className="rounded bg-muted px-1.5 py-1">{text("preview.fieldResult")}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{text("preview.pendingBet")}</span>
                  <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">{text("preview.toReview")}</span>
                </div>
                <p className="mt-1 text-[0.68rem] text-muted-foreground">{text("preview.pendingFields")}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-primary p-3 text-xs font-semibold text-primary-foreground">{text("preview.saved")}</div>
          </article>
        </div>
        <article className="mt-3 rounded-2xl border border-border bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{text("preview.statsLabel")}</p>
              <p className="mt-1 text-sm font-semibold">{text("preview.statsTitle")}</p>
            </div>
            <ChartLineUp size={23} className="text-profit" weight="bold" aria-hidden />
          </div>
          <svg viewBox="0 0 360 80" className="mt-4 h-16 w-full" role="img" aria-label={text("preview.chartAlt")}>
            <path d="M0 60 C35 58, 44 44, 77 51 S121 62, 149 40 S194 57, 222 30 S272 47, 302 19 S337 28, 360 8" fill="none" stroke="var(--profit)" strokeWidth="3" strokeLinecap="round" />
            <path d="M0 68 H360" fill="none" stroke="var(--border)" strokeWidth="1" />
          </svg>
        </article>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{text("preview.caption")}</p>
    </div>
  );
}
