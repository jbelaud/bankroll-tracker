"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CheckCircle, CaretDown, Handshake, Infinity, Scan } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PartnerSection, PublicPartner } from "@/lib/partners/catalogue";
import { PartnerCard } from "@/components/marketing/partners-page";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trackPublicGrowthEvent } from "@/lib/growth/client";
import { PartnerClaimForm } from "./partner-claim-form";
import type { MemberPartnerClaim } from "@/lib/partners/claims-types";

export function MemberPartnersPage({ partners, claims = [] }: { partners: PublicPartner[]; claims?: MemberPartnerClaim[] }) {
  const t = useTranslations("partners");
  const claimText = useTranslations("partnerReferrals");
  const locale = useLocale() as Locale;
  const [section, setSection] = useState<PartnerSection>("bookmakers");
  const viewed = useRef(false);
  const activeOffers = partners.filter((p) => p.section === "bookmakers" && p.status === "ACTIVE").length;
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void trackPublicGrowthEvent("partners_page_view", { locale, audience: "member" }).catch(() => {});
  }, [locale]);

  return <div className="min-w-0 space-y-4 sm:space-y-5">
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl"><Handshake size={26} className="shrink-0 text-primary" aria-hidden />{t("member.title")}</h1>
        <Link href="/account/subscription" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring sm:text-sm"><Scan size={17} aria-hidden />{t("member.myScans")}<ArrowUpRight size={14} aria-hidden /></Link>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t("member.description")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1.5 font-medium text-primary"><Infinity size={15} aria-hidden />{t("member.rewardSummary")}</span>
        <span className="text-muted-foreground">{t("member.offerCount", { count: activeOffers })}</span>
      </div>
    </header>

    <Tabs value={section} onValueChange={(value) => {
      if ((value === "bookmakers" || value === "tools") && value !== section) {
        setSection(value);
        void trackPublicGrowthEvent("partners_tab_changed", { tab: value, audience: "member" }).catch(() => {});
      }
    }}>
      <TabsList aria-label={t("tabsLabel")} className="grid w-full max-w-xl grid-cols-2 gap-1 rounded-xl border border-border p-1 group-data-horizontal/tabs:h-auto">
        <TabsTrigger value="bookmakers" className="min-h-11 rounded-lg px-2 py-2 text-sm whitespace-normal">{t("bookmakers.tab")}</TabsTrigger>
        <TabsTrigger value="tools" className="min-h-11 rounded-lg px-2 py-2 text-sm whitespace-normal">{t("tools.tab")}</TabsTrigger>
      </TabsList>
      <div className="mt-2 rounded-xl border border-border bg-card/50 px-3 pb-3 sm:px-4">
        <details className="group/steps">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">{t("member.howTitle")}<CaretDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open/steps:rotate-180" aria-hidden /></summary>
          <ol className="mb-3 grid gap-3 border-t border-border pt-3 md:grid-cols-3">
            {(["choose", "refer", "validate"] as const).map((step, index) => <li key={step} className="flex min-w-0 gap-2">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
              <div><h3 className="text-sm font-semibold">{t(`member.steps.${step}.title`)}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(`member.steps.${step}.description`)}</p></div>
            </li>)}
          </ol>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t("member.once")}</p>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">{t("member.validationPending")}</p>
        </details>
        <p className="text-xs leading-5 text-muted-foreground">{t("member.validationNotice")}</p>
      </div>
      {(["bookmakers", "tools"] as const).map((tab) => {
        const items = partners.filter((p) => p.section === tab);
        return <TabsContent key={tab} value={tab} keepMounted className="mt-3 data-[hidden]:hidden">
          <h2 className="sr-only">{t(`${tab}.title`)}</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t(`${tab}.description`)}</p>
          {items.length ? <div className="mt-3 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">{items.map((partner) => {
            const claim = claims.find((item) => item.partnerId === partner.id);
            return <PartnerCard key={partner.id} partner={partner} locale={locale}>
              {(claim || (partner.section === "bookmakers" && partner.scanReward)) && <PartnerClaimForm key={`${partner.id}-${claim?.revision ?? 0}`} partnerId={partner.id} quantity={claim?.rewardQuantity ?? partner.scanReward!.quantity} claim={claim} />}
            </PartnerCard>;
          })}</div>
            : <div className="mt-5 rounded-2xl border border-border bg-card p-6"><h3 className="font-semibold">{t(`${tab}.emptyTitle`)}</h3><p className="mt-2 text-sm text-muted-foreground">{t(`${tab}.emptyDescription`)}</p></div>}
        </TabsContent>;
      })}
    </Tabs>

    {claims.length > 0 && <details className="rounded-xl border border-border bg-card/50 px-4 py-2">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">{claimText("history", { count: claims.length })}</summary>
      <ul className="divide-y divide-border">{claims.map((claim) => <li key={claim.id} className="py-3">
        <p className="flex flex-wrap justify-between gap-2 text-sm"><strong>{claim.partnerName}</strong><span className="text-muted-foreground">{claimText(`statuses.${claim.status}`)}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{claim.bookmakerUsername} · {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(claim.createdAt))}</p>
        {!partners.some((partner) => partner.id === claim.partnerId) && <PartnerClaimForm key={`${claim.id}-${claim.revision}`} partnerId={claim.partnerId} quantity={claim.rewardQuantity} claim={claim} />}
      </li>)}</ul>
    </details>}

    <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5 sm:flex-row sm:p-6">
      <CheckCircle size={25} className="shrink-0 text-primary" aria-hidden />
      <div><h2 className="text-base font-semibold">{t("member.reassuranceTitle")}</h2><p className="mt-2 max-w-4xl text-xs leading-7 text-muted-foreground">{t("member.reassurance")}</p><p className="mt-2 max-w-4xl text-xs leading-7 text-muted-foreground">{t("transparency.description")}</p><Link href="/responsible-gambling" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary underline-offset-4 hover:underline">{t("responsible.link")}<ArrowUpRight size={14} aria-hidden /></Link></div>
    </aside>
  </div>;
}
