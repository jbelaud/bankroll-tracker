"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type FilterValues = {
  from: string;
  to: string;
  q: string;
  bankroll: string;
  sport: string;
  type: string;
  result: string;
  live: string;
  freebet: string;
  minStake: number | null;
  maxStake: number | null;
  minOdds: number | null;
  maxOdds: number | null;
};

export function StatsFilters({
  values,
  bankrolls,
  sportOptions,
  typesBySport,
  open,
}: {
  values: FilterValues;
  bankrolls: { id: string; name: string }[];
  sportOptions: string[];
  typesBySport: Record<string, string[]>;
  open: boolean;
}) {
  const t = useTranslations("stats.filters");
  const [sport, setSport] = useState(values.sport);
  const [betType, setBetType] = useState(values.type);
  const availableTypes = sport ? typesBySport[sport] ?? [] : [];

  return (
    <details className="glass-card rounded-xl p-3" open={open}>
      <summary className="cursor-pointer text-sm font-semibold">{t("title")}</summary>
      <form method="get" className="mt-3 grid grid-cols-2 gap-2">
        <input name="from" type="date" defaultValue={values.from} aria-label={t("startDate")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <input name="to" type="date" defaultValue={values.to} aria-label={t("endDate")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <input name="q" defaultValue={values.q} placeholder={t("search")} className="col-span-2 h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <select name="bankroll" defaultValue={values.bankroll} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("allBankrolls")}</option>{bankrolls.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="sport" value={sport} onChange={(event) => { setSport(event.target.value); setBetType(""); }} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("allSports")}</option>{sportOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select name="type" value={betType} onChange={(event) => setBetType(event.target.value)} disabled={!sport} className="h-10 rounded-lg border border-input bg-background px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"><option value="">{sport ? t("allTypes") : t("chooseSportFirst")}</option>{availableTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select name="result" defaultValue={values.result} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("allResults")}</option><option value="GAGNE">{t("won")}</option><option value="PERDU">{t("lost")}</option><option value="REMBOURSE">{t("refunded")}</option><option value="CASHE">{t("cashedOut")}</option><option value="EN_ATTENTE">{t("pending")}</option></select>
        <input name="minStake" type="number" step="0.01" defaultValue={values.minStake ?? ""} placeholder={t("minStake")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <input name="maxStake" type="number" step="0.01" defaultValue={values.maxStake ?? ""} placeholder={t("maxStake")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <input name="minOdds" type="number" step="0.01" defaultValue={values.minOdds ?? ""} placeholder={t("minOdds")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <input name="maxOdds" type="number" step="0.01" defaultValue={values.maxOdds ?? ""} placeholder={t("maxOdds")} className="h-10 rounded-lg border border-input bg-transparent px-3 text-xs" />
        <select name="live" defaultValue={values.live} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("allLive")}</option><option value="true">{t("liveOnly")}</option><option value="false">{t("nonLive")}</option></select>
        <select name="freebet" defaultValue={values.freebet} className="h-10 rounded-lg border border-input bg-background px-3 text-xs"><option value="">{t("allFreebets")}</option><option value="true">{t("freebetOnly")}</option><option value="false">{t("nonFreebet")}</option></select>
        <button type="submit" className="col-span-2 h-10 rounded-lg bg-primary text-xs font-semibold text-primary-foreground">{t("apply")}</button>
      </form>
    </details>
  );
}
