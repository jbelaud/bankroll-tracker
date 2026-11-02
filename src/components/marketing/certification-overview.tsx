import { ArrowRight, CheckCircle, Clock, ListChecks, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { certificationCopy } from "@/lib/marketing/certification-copy";

export function ProofJourney({ locale }: { locale: Locale }) {
  const copy = certificationCopy[locale];
  const icons = [Clock, ShieldCheck, ListChecks];
  return <div className="min-w-0 rounded-3xl border border-primary/25 bg-card p-5 shadow-[0_20px_60px_oklch(0.02_0.01_260_/_20%)] sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
      <p className="text-sm font-semibold">{copy.demo}</p>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-profit/10 px-3 py-1.5 text-xs font-semibold text-profit"><ShieldCheck size={15} weight="fill" aria-hidden />{copy.complete}</span>
    </div>
    <ol className="mt-6 space-y-5">
      {copy.steps.map((step, index) => {
        const Icon = icons[index];
        return <li key={step.title} className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon size={21} aria-hidden /></span>
          <div><p className="text-sm font-semibold">{step.title}</p><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.description}</p></div>
        </li>;
      })}
    </ol>
    <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">{copy.demoNote}</p>
  </div>;
}

export function CertificationOverview({ locale }: { locale: Locale }) {
  const copy = certificationCopy[locale];
  return <section id="certification" className="marketing-section scroll-mt-20 border-b border-border bg-primary/[0.035]" aria-labelledby="home-certification-title">
    <div className="kalivoa-content-frame grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="marketing-eyebrow"><ShieldCheck size={18} weight="fill" aria-hidden />{copy.eyebrow}</p>
        <h2 id="home-certification-title" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{copy.title}</h2>
        <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">{copy.homeDescription}</p>
        <ul className="mt-6 space-y-3">{copy.benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2 text-sm"><CheckCircle size={19} className="mt-0.5 shrink-0 text-profit" weight="fill" aria-hidden />{benefit}</li>)}</ul>
        <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">{copy.summary}</p>
        <Link href="/certification" locale={locale} className="marketing-primary-cta mt-7">{copy.homeCta}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
      </div>
      <ProofJourney locale={locale} />
    </div>
  </section>;
}
