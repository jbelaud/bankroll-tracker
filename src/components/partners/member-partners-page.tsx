"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CheckCircle, Handshake, Infinity, Scan, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PartnerSection, PublicPartner } from "@/lib/partners/catalogue";
import { PartnerCard } from "@/components/marketing/partners-page";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trackPublicGrowthEvent } from "@/lib/growth/client";

export function MemberPartnersPage({ partners }: { partners: PublicPartner[] }) {
  const t = useTranslations("partners");
  const locale = useLocale() as Locale;
  const [section, setSection] = useState<PartnerSection>("bookmakers");
  const viewed = useRef(false);
  const activeOffers = partners.filter((p) => p.section === "bookmakers" && p.status === "ACTIVE").length;
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void trackPublicGrowthEvent("partners_page_view", { locale, audience: "member" }).catch(() => {});
  }, [locale]);

  return <div className="min-w-0 space-y-7">
    <header className="relative isolate overflow-hidden rounded-3xl border border-primary/20 bg-card p-5 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,oklch(0.72_0.14_250_/_15%),transparent_65%)]" />
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Handshake size={17} aria-hidden />{t("member.eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t("member.title")}</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{t("member.description")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"><Infinity size={16} aria-hidden />{t("member.permanent")}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground"><ShieldCheck size={16} aria-hidden />{t("member.once")}</span>
          </div>
        </div>
        <Link href="/account/subscription" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><Scan size={18} aria-hidden />{t("member.myScans")}<ArrowUpRight size={16} aria-hidden /></Link>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MemberStat value={String(activeOffers)} label={t("member.available")} />
        <MemberStat value="30" label={t("member.perOffer")} />
        <MemberStat value={t("member.noExpiryValue")} label={t("member.noExpiryLabel")} />
      </div>
    </header>

    <section aria-labelledby="partner-steps-title" className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
      <h2 id="partner-steps-title" className="text-base font-semibold">{t("member.howTitle")}</h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {(["choose", "refer", "validate"] as const).map((step, index) => <li key={step} className="flex min-w-0 gap-3">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
          <div><h3 className="text-sm font-semibold">{t(`member.steps.${step}.title`)}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{t(`member.steps.${step}.description`)}</p></div>
        </li>)}
      </ol>
      <p className="mt-5 rounded-xl border border-border bg-background/60 p-3 text-xs leading-6 text-muted-foreground">{t("member.validationPending")}</p>
    </section>

    <Tabs value={section} onValueChange={(value) => {
      if ((value === "bookmakers" || value === "tools") && value !== section) {
        setSection(value);
        void trackPublicGrowthEvent("partners_tab_changed", { tab: value, audience: "member" }).catch(() => {});
      }
    }}>
      <TabsList aria-label={t("tabsLabel")} className="grid w-full max-w-xl grid-cols-2 gap-1 rounded-xl border border-border p-1 group-data-horizontal/tabs:h-auto">
        <TabsTrigger value="bookmakers" className="min-h-12 rounded-lg px-2 py-3 text-sm whitespace-normal">{t("bookmakers.tab")}</TabsTrigger>
        <TabsTrigger value="tools" className="min-h-12 rounded-lg px-2 py-3 text-sm whitespace-normal">{t("tools.tab")}</TabsTrigger>
      </TabsList>
      {(["bookmakers", "tools"] as const).map((tab) => {
        const items = partners.filter((p) => p.section === tab);
        return <TabsContent key={tab} value={tab} keepMounted className="mt-5 data-[hidden]:hidden">
          <h2 className="text-xl font-semibold">{t(`${tab}.title`)}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{t(`${tab}.description`)}</p>
          {items.length ? <div className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">{items.map((partner) => <PartnerCard key={partner.id} partner={partner} locale={locale} />)}</div>
            : <div className="mt-5 rounded-2xl border border-border bg-card p-6"><h3 className="font-semibold">{t(`${tab}.emptyTitle`)}</h3><p className="mt-2 text-sm text-muted-foreground">{t(`${tab}.emptyDescription`)}</p></div>}
        </TabsContent>;
      })}
    </Tabs>

    <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5 sm:flex-row sm:p-6">
      <CheckCircle size={25} className="shrink-0 text-primary" aria-hidden />
      <div><h2 className="text-base font-semibold">{t("member.reassuranceTitle")}</h2><p className="mt-2 max-w-4xl text-xs leading-7 text-muted-foreground">{t("member.reassurance")}</p><p className="mt-2 max-w-4xl text-xs leading-7 text-muted-foreground">{t("transparency.description")}</p><Link href="/responsible-gambling" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary underline-offset-4 hover:underline">{t("responsible.link")}<ArrowUpRight size={14} aria-hidden /></Link></div>
    </aside>
  </div>;
}

function MemberStat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0 rounded-2xl border border-border bg-background/50 px-4 py-4"><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}
