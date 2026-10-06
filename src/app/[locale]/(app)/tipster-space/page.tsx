import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  CheckCircle,
  Circle,
  Eye,
  EyeSlash,
  IdentificationCard,
  Scan,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PublicTipsterProfileForm } from "@/components/account/public-tipster-profile-form";
import { PublicBankrollOrder } from "@/components/account/public-bankroll-order";
import { CertificationExplainer } from "@/components/bankrolls/certification-explainer";
import { requireUser } from "@/lib/auth";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";

const CERTIFIED_LEVELS = new Set(["BRONZE", "SILVER", "GOLD"]);

export default async function TipsterSpacePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const [{ locale }, user, t] = await Promise.all([
    params,
    requireUser(),
    getTranslations("tipsterSpace"),
  ]);
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      publicDisplayName: true,
      publicHandle: true,
      publicBio: true,
      publicAvatarUrl: true,
      publicBannerUrl: true,
      publicXHandle: true,
      bankrolls: {
        orderBy: [{ publicOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          isPublic: true,
          publicSlug: true,
          referenceCapital: true,
          certificationStartedAt: true,
          bets: {
            select: {
              createdAt: true,
              date: true,
              result: true,
              stakeUnits: true,
              entryMethod: true,
              initialProofAt: true,
              initialProofBeforeEvent: true,
              resultProofAt: true,
              resultEntryMethod: true,
              _count: { select: { corrections: true } },
            },
          },
        },
      },
    },
  });

  const profileReady = Boolean(account.publicDisplayName && account.publicHandle);
  const bankrolls = account.bankrolls.map((bankroll) => ({
    ...bankroll,
    summary: certificationSummary(bankroll.bets, bankroll.certificationStartedAt),
    missingUnitCount: bankroll.bets.filter((bet) => bet.stakeUnits === null).length,
    correctionCount: bankroll.bets.reduce((sum, bet) => sum + bet._count.corrections, 0),
  }));
  const configuredBankrolls = bankrolls.filter((bankroll) => Boolean(bankroll.referenceCapital) && bankroll.missingUnitCount === 0);
  const startedBankrolls = bankrolls.filter((bankroll) => bankroll.certificationStartedAt);
  const certifiedBankrolls = startedBankrolls.filter((bankroll) => CERTIFIED_LEVELS.has(bankroll.summary.level));
  const publicBankrolls = bankrolls.filter((bankroll) => bankroll.isPublic);
  const evaluatedButUncertified = startedBankrolls.some((bankroll) => bankroll.summary.level === "UNVERIFIED");
  const canViewProfile = Boolean(account.publicHandle && publicBankrolls.length > 0);
  const steps = [
    { icon: IdentificationCard, title: t("steps.profile.title"), description: t("steps.profile.description"), done: profileReady },
    { icon: Wallet, title: t("steps.bankroll.title"), description: t("steps.bankroll.description"), done: configuredBankrolls.length > 0 },
    { icon: ShieldCheck, title: t("steps.publish.title"), description: t("steps.publish.description"), done: startedBankrolls.length > 0 },
    { icon: Scan, title: t("steps.certify.title"), description: t("steps.certify.description"), done: certifiedBankrolls.length > 0 },
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const status = !profileReady
    ? t("status.profileIncomplete")
    : startedBankrolls.length === 0
      ? t("status.inactive")
      : certifiedBankrolls.length > 0
        ? t("status.certified", { count: certifiedBankrolls.length })
        : evaluatedButUncertified
          ? t("status.unverified")
          : t("status.observation");
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const levelLabel = (level: string) => {
    if (level === "GOLD") return t("levels.gold");
    if (level === "SILVER") return t("levels.silver");
    if (level === "BRONZE") return t("levels.bronze");
    if (level === "UNVERIFIED") return t("levels.unverified");
    return t("levels.observation");
  };

  return <div className="min-w-0 space-y-6">
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck size={29} weight="fill" aria-hidden /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("eyebrow")}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">{status}</span>
              <span className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">{t("progress", { done: completedSteps, total: steps.length })}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          {canViewProfile ? <Link href={`/t/${account.publicHandle}`} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Eye size={17} aria-hidden />{t("viewProfile")}</Link> : <a href="#identity" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><IdentificationCard size={17} aria-hidden />{t("configureProfile")}</a>}
          <Link href="/bankrolls" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"><Wallet size={17} aria-hidden />{t("manageBankrolls")}</Link>
        </div>
      </div>
    </section>

    <section aria-labelledby="tipster-path-title">
      <div><h2 id="tipster-path-title" className="text-lg font-semibold">{t("pathTitle")}</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pathIntro")}</p></div>
      <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{steps.map((step, index) => {
        const Icon = step.icon;
        return <li key={step.title} className={`rounded-2xl border p-4 ${step.done ? "border-profit/35 bg-profit/[0.07]" : "border-border bg-card/30"}`}>
          <div className="flex items-center justify-between gap-3"><span className={`flex size-10 items-center justify-center rounded-xl ${step.done ? "bg-profit/15 text-profit" : "bg-muted text-muted-foreground"}`}><Icon size={21} weight={step.done ? "fill" : "regular"} aria-hidden /></span>{step.done ? <CheckCircle size={20} weight="fill" className="text-profit" aria-label={t("done")} /> : <Circle size={20} className="text-muted-foreground" aria-label={t("todo")} />}</div>
          <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">{t("step", { number: index + 1 })}</p>
          <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
        </li>;
      })}</ol>
    </section>

    <section id="bankrolls" aria-labelledby="certification-bankrolls-title" className="scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="certification-bankrolls-title" className="text-lg font-semibold">{t("bankrollsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("bankrollsIntro")}</p></div><Link href="/bankrolls?create=1" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">{t("createBankroll")}</Link></div>
      {bankrolls.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center"><Wallet size={30} className="mx-auto text-muted-foreground" aria-hidden /><h3 className="mt-3 font-semibold">{t("emptyTitle")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p></div> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{bankrolls.map((bankroll) => {
        const started = Boolean(bankroll.certificationStartedAt);
        const settledProgress = Math.min(100, (bankroll.summary.settledBets / 10) * 100);
        const level = levelLabel(bankroll.summary.level);
        return <article key={bankroll.id} className="rounded-2xl border border-border bg-card/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{bankroll.name}</h3><p className="mt-1 text-xs text-muted-foreground">{started ? t("trackingSince", { date: new Intl.DateTimeFormat(locale, { timeZone: "Europe/Paris" }).format(bankroll.certificationStartedAt!) }) : t("notStarted")}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${bankroll.isPublic ? "bg-profit/15 text-profit" : started ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{bankroll.isPublic ? <Eye size={13} weight="fill" aria-hidden /> : <EyeSlash size={13} aria-hidden />}{bankroll.isPublic ? t("public") : started ? t("hidden") : t("private")}</span></div>
          {started ? <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label={t("score")} value={bankroll.summary.score === null ? "—" : `${bankroll.summary.score}/100`} /><Metric label={t("level")} value={level} /><Metric label={t("completeVolume")} value={`${bankroll.summary.strongVolumePercent}%`} /><Metric label={t("volumeProgress")} value={`${number.format(bankroll.summary.volume)}u`} /></div>
            <div className="mt-4"><Progress label={t("settledProgress")} value={`${bankroll.summary.settledBets}/10`} percent={settledProgress} /></div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{bankroll.summary.level === "OBSERVATION" ? t("observationHelp") : t("certificationResult", { level })}{bankroll.correctionCount > 0 ? ` · ${t("corrections", { count: bankroll.correctionCount })}` : ""}</p>
          </> : <div className="mt-4 rounded-xl border border-border bg-background/30 p-3 text-xs leading-relaxed text-muted-foreground">{!bankroll.referenceCapital ? t("missingReference") : bankroll.missingUnitCount > 0 ? t("missingUnits", { count: bankroll.missingUnitCount }) : t("readyToPublish")}</div>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4"><Link href={`/bankrolls/${bankroll.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">{t("manage")}<ArrowRight size={14} aria-hidden /></Link>{bankroll.isPublic && bankroll.publicSlug ? <Link href={`/p/${bankroll.publicSlug}`} target="_blank" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"><Eye size={14} aria-hidden />{t("viewPublicPage")}</Link> : null}</div>
        </article>;
      })}</div>}
    </section>

    <section aria-labelledby="rules-title"><h2 id="rules-title" className="text-lg font-semibold">{t("rulesTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("rulesIntro")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Rule value="10" label={t("rules.bets")} /><Rule value="40/100" label={t("rules.bronze")} /></div></section>
    <CertificationExplainer />

    <div id="identity" className="scroll-mt-24 space-y-5">
      <PublicTipsterProfileForm profile={{ publicDisplayName: account.publicDisplayName, publicHandle: account.publicHandle, publicBio: account.publicBio, publicAvatarUrl: account.publicAvatarUrl, publicBannerUrl: account.publicBannerUrl, publicXHandle: account.publicXHandle }} googleAvatarUrl={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null} />
      <PublicBankrollOrder bankrolls={startedBankrolls.map(({ id, name, isPublic }) => ({ id, name, isPublic }))} />
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-border bg-background/30 p-3"><span className="block truncate text-[0.6rem] uppercase tracking-wide text-muted-foreground">{label}</span><strong className="num mt-1 block truncate text-sm">{value}</strong></div>;
}

function Progress({ label, value, percent }: { label: string; value: string; percent: number }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><strong className="num">{value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} /></div></div>;
}

function Rule({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border border-border bg-card/30 p-4"><strong className="num text-xl text-primary">{value}</strong><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{label}</p></div>;
}
