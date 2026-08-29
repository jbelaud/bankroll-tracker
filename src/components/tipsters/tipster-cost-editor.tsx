"use client";

import { useState, useTransition } from "react";
import type { Currency, TipsterCostFrequency } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { endTipsterCostPeriod, setTipsterCostPeriod } from "@/lib/actions/tipster-costs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FREQUENCIES: TipsterCostFrequency[] = ["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

export function TipsterCostEditor({
  tipsterId,
  currency,
  current,
}: {
  tipsterId: string;
  currency: Currency;
  current: {
    kind: "FREE" | "PAID";
    amount: number | null;
    frequency: TipsterCostFrequency | null;
    startDate: string;
    endDate: string | null;
  } | null;
}) {
  const t = useTranslations("tipsters.costEditor");
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<"FREE" | "PAID">(current?.kind ?? "PAID");
  const [amount, setAmount] = useState(current?.amount?.toString() ?? "");
  const [frequency, setFrequency] = useState<TipsterCostFrequency>(current?.frequency ?? "MONTHLY");
  const [startDate, setStartDate] = useState(current?.startDate ?? today);
  const [endDate, setEndDate] = useState(current?.endDate ?? "");
  const [stopDate, setStopDate] = useState(today);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError("");
    startTransition(async () => {
      const result = await setTipsterCostPeriod(tipsterId, {
        kind,
        amount: kind === "PAID" ? Number(amount) : null,
        frequency: kind === "PAID" ? frequency : null,
        startDate,
        endDate: endDate || null,
      });
      if (!result.success) return setError(t(`errors.${result.error}`));
      router.refresh();
    });
  };

  const stop = () => {
    setError("");
    startTransition(async () => {
      const result = await endTipsterCostPeriod(tipsterId, stopDate);
      if (!result.success) return setError(t(`errors.${result.error}`));
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="cost-kind">{t("state")}</Label>
          <select id="cost-kind" value={kind} onChange={(event) => setKind(event.target.value as "FREE" | "PAID")} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="FREE">{t("free")}</option>
            <option value="PAID">{t("paid")}</option>
          </select>
        </div>
        {kind === "PAID" ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cost-amount">{t("amount", { currency })}</Label>
              <Input id="cost-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cost-frequency">{t("frequency")}</Label>
              <select id="cost-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as TipsterCostFrequency)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                {FREQUENCIES.map((value) => <option key={value} value={value}>{t(`frequencies.${value}`)}</option>)}
              </select>
            </div>
          </>
        ) : null}
        <div className="flex flex-col gap-1">
          <Label htmlFor="cost-start">{t("startDate")}</Label>
          <Input id="cost-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cost-end">{t("endDateOptional")}</Label>
          <Input id="cost-end" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">{t("billingRule")}</p>
        {error ? <p role="alert" className="text-xs text-loss sm:col-span-2">{error}</p> : null}
        <Button type="button" onClick={save} disabled={isPending} className="min-h-touch rounded-lg sm:col-span-2">
          {isPending ? t("saving") : current ? t("saveChange") : t("save")}
        </Button>
      </div>

      {current && !current.endDate ? (
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <h3 className="text-sm font-semibold">{t("stopTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("stopDescription")}</p>
          <Label htmlFor="cost-stop" className="mt-3">{t("endDate")}</Label>
          <Input id="cost-stop" type="date" value={stopDate} min={current.startDate} onChange={(event) => setStopDate(event.target.value)} className="mt-1" />
          <Button type="button" variant="outline" onClick={stop} disabled={isPending} className="mt-3 min-h-touch w-full rounded-lg">
            {t("stop")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
