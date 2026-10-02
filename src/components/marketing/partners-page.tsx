"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, ChartLineUp, Copy, Handshake, House, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PartnerSection, PublicPartner } from "@/lib/partners/catalogue";
import type { PublicGrowthEventName } from "@/lib/growth/events";
import { trackPublicGrowthEvent } from "@/lib/growth/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function track(name: PublicGrowthEventName, properties?: Record<string, string>) {
  // Un stockage navigateur indisponible ne doit pas bloquer un lien ou une copie.
  void trackPublicGrowthEvent(name, properties).catch(() => {});
}

export function PartnersPage({ partners }: { partners: PublicPartner[] }) {
  const t = useTranslations("partners");
  const locale = useLocale() as Locale;
  const [section, setSection] = useState<PartnerSection>("bookmakers");
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("partners_page_view", { locale });
  }, [locale]);

  return <article className="pb-14 sm:pb-20">
    <header className="marketing-hero border-b border-border/60 py-9 sm:py-16">
      <div className="kalivoa-content-frame">
        <nav aria-label={t("breadcrumb")} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex min-h-8 items-center gap-1 hover:text-foreground"><House size={14} aria-hidden />{t("home")}</Link>
          <span aria-hidden>/</span><span aria-current="page">{t("nav")}</span>
        </nav>
        <div className="mt-7 max-w-3xl sm:mt-10">
          <p className="marketing-eyebrow"><Handshake size={16} aria-hidden />{t("eyebrow")}</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{t("title")}</h1>
          <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{t("description")}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{t("positioning")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["tracking", "analysis", "discipline"] as const).map((key) => <span key={key} className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium">{t(`principles.${key}`)}</span>)}
          </div>
        </div>
      </div>
    </header>

    <div className="kalivoa-content-frame pt-7 sm:pt-10">
      <Tabs value={section} onValueChange={(value) => {
        if ((value === "bookmakers" || value === "tools") && value !== section) {
          setSection(value); track("partners_tab_changed", { tab: value });
        }
      }}>
        <TabsList aria-label={t("tabsLabel")} className="grid w-full max-w-xl grid-cols-2 gap-1 rounded-xl border border-border p-1 group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="bookmakers" className="min-h-12 rounded-lg px-2 py-3 text-sm whitespace-normal">{t("bookmakers.tab")}</TabsTrigger>
          <TabsTrigger value="tools" className="min-h-12 rounded-lg px-2 py-3 text-sm whitespace-normal">{t("tools.tab")}</TabsTrigger>
        </TabsList>
        {(["bookmakers", "tools"] as const).map((tab) => {
          const items = partners.filter((p) => p.section === tab);
          return <TabsContent key={tab} value={tab} keepMounted className="mt-6 data-[hidden]:hidden">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight">{t(`${tab}.title`)}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{t(`${tab}.description`)}</p>
            </div>
            {tab === "bookmakers" && <p className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-6">{t(items.some((p) => p.scanReward) ? "scansNoticeWithRewards" : "scansNotice")}</p>}
            {tab === "tools" && <div className="mt-5 flex flex-wrap gap-2" aria-label={t("categoriesLabel")}>
              {(["odds", "data", "community", "training", "other"] as const).map((key) => <span key={key} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">{t(`categories.${key}`)}</span>)}
            </div>}
            {items.length > 0 ? <div className="mt-6 grid items-start gap-4 md:grid-cols-2">
              {items.map((partner) => <PartnerCard key={partner.id} partner={partner} locale={locale} />)}
            </div> : <div className="marketing-card mt-6 p-6 sm:p-8">
              <h3 className="text-base font-semibold">{t(`${tab}.emptyTitle`)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`${tab}.emptyDescription`)}</p>
            </div>}
          </TabsContent>;
        })}
      </Tabs>

      <section id="conditions-offres" className="mt-10 rounded-xl border border-border bg-card/40 p-5 sm:mt-14 sm:p-7">
        <h2 className="text-xl font-semibold">{t("transparency.title")}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{t("transparency.description")}</p>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{t("transparency.terms")}</p>
        <Link href="/terms" className="marketing-text-link mt-4 min-h-10 text-sm">{t("transparency.link")}<ArrowUpRight size={15} aria-hidden /></Link>
      </section>
      <section className="marketing-solution mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:gap-5 sm:p-7">
        <ShieldCheck size={28} className="shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold">{t("responsible.title")}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{t("responsible.description")}</p>
          <Link href="/responsible-gambling" className="marketing-text-link mt-4 min-h-10 text-sm">{t("responsible.link")}<ArrowUpRight size={15} aria-hidden /></Link>
        </div>
      </section>
    </div>
  </article>;
}

export function PartnerCard({ partner, locale }: { partner: PublicPartner; locale: Locale }) {
  const t = useTranslations("partners");
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const active = partner.status === "ACTIVE";
  const expiry = partner.offerExpiresAt ? new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
  }).format(new Date(partner.offerExpiresAt)) : null;
  const statusLabel = partner.statusNote?.[locale] ?? t(`statuses.${partner.status}`);
  const copyCode = async () => {
    if (!partner.promoCode) return;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(partner.promoCode);
      setCopyState("copied");
      track("promo_code_copied", { partner: partner.id });
    } catch { setCopyState("failed"); }
  };

  return <article className={cn("marketing-card flex min-w-0 flex-col p-5 sm:p-6", partner.featured && "border-primary/40")}>
    <div className="flex items-start gap-3">
      {partner.logo ? <Image src={partner.logo.src} alt={partner.logo.alt[locale]} width={48} height={48} className="size-12 rounded-xl object-contain" />
        : <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-lg font-bold">{partner.name.slice(0, 2).toUpperCase()}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t(`categories.${partner.category}`)}</p>
        <h3 className="mt-1 break-words text-xl font-semibold">{partner.name}</h3>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", active ? "border-profit/25 bg-profit/10 text-profit" : "border-border bg-muted/60 text-muted-foreground")}>{statusLabel}</span>
      {active && partner.section === "bookmakers" && <span className="rounded-full border border-border px-2.5 py-1 text-xs">{t("referralBadge")}</span>}
      {partner.scanReward && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{t("freeScans", { count: partner.scanReward.quantity })}</span>}
      {partner.featured && <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary">{t("featured")}</span>}
    </div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">{partner.description[locale]}</p>
    {partner.offer && <p className="mt-4 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-sm font-semibold">{partner.offer[locale]}</p>}
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{partner.details[locale]}</p>
    {expiry && <p className="mt-3 text-xs text-muted-foreground">{t(active ? "offerExpires" : "offerExpired", { date: expiry })}</p>}
    {partner.scanReward && <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <p className="text-sm font-semibold">{t("freeScans", { count: partner.scanReward.quantity })}</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">{partner.scanReward.conditions[locale]}</p>
      <p className="mt-1 text-xs text-muted-foreground">{partner.scanReward.expiresAfterDays === null ? t("permanentScans") : t("scanExpiry", { days: partner.scanReward.expiresAfterDays })}</p>
    </div>}
    <details id={`conditions-${partner.id}`} className="mt-4 border-t border-border pt-3">
      <summary className="min-h-10 cursor-pointer rounded-md py-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{t("seeConditions")}</summary>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{partner.conditions[locale]}</p>
      {partner.conditionsHref && <a href={partner.conditionsHref} target="_blank" rel="sponsored noopener noreferrer" className="marketing-text-link mt-2 min-h-10 text-xs">{t("fullConditions")}<ArrowUpRight size={14} aria-hidden /><span className="sr-only">{t("newWindow")}</span></a>}
    </details>
    {active && partner.promoCode && <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{t("referralCode")}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <code className="break-all text-sm font-semibold">{partner.promoCode}</code>
        <Button variant="outline" onClick={copyCode} disabled={copyState === "copying"} aria-label={t("copyAria", { name: partner.name })} className="min-h-10 rounded-lg px-3"><Copy size={16} aria-hidden />{t(copyState === "copied" ? "copied" : "copy")}</Button>
      </div>
      <p role="status" className="text-xs leading-6 text-muted-foreground">{copyState === "failed" ? t("copyFailed") : copyState === "copied" ? t("copied") : null}</p>
    </div>}
    {active && partner.href ? <div className="mt-5">
      <a href={partner.href} target="_blank" rel="sponsored noopener noreferrer" onClick={() => track(partner.section === "bookmakers" ? "bookmaker_clicked" : "partner_clicked", { partner: partner.id })} className="marketing-secondary-cta w-full justify-center text-sm">
        {t(partner.section === "bookmakers" ? "viewReferral" : "viewTool")}<ArrowUpRight size={16} aria-hidden /><span className="sr-only">{t("newWindow")}</span>
      </a>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t(partner.section === "bookmakers" ? "referralLink" : "partnerLink")}</p>
    </div> : <p className="mt-5 flex items-center gap-2 text-xs leading-6 text-muted-foreground"><ChartLineUp size={16} className="shrink-0" aria-hidden />{t(partner.status === "PREPARATION" ? "preparationNotice" : "unavailableNotice")}</p>}
  </article>;
}
