"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Buildings, Plus, Trash, Wallet } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import type { Currency } from "@prisma/client";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencySymbol } from "@/lib/format";
import { createBankrollForm, updateBankrollForm } from "@/lib/actions/bankroll-forms";
import { KNOWN_BOOKMAKERS } from "@/lib/bookmakers";
import { cn } from "@/lib/utils";

type Mode = "SINGLE" | "DISTRIBUTED";
type AllocationDraft = { key: string; bookmaker: string; initial: string };

export type BankrollFormTarget = {
  id: string;
  name: string;
  mode: Mode;
  bookmaker: string | null;
  initial: number;
  referenceCapital: number | null;
  allocations: { id: string; bookmaker: string; initial: number }[];
};

function allocationDrafts(bankroll?: BankrollFormTarget): AllocationDraft[] {
  if (bankroll?.allocations.length) return bankroll.allocations.map((allocation) => ({
    key: allocation.id,
    bookmaker: allocation.bookmaker,
    initial: String(allocation.initial),
  }));
  return [{ key: crypto.randomUUID(), bookmaker: bankroll?.bookmaker ?? "", initial: String(bankroll?.initial ?? 0) }];
}

export function BankrollFormDrawer({ open, onOpenChange, bankroll, currency, returnTo }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankroll?: BankrollFormTarget;
  currency: Currency;
  returnTo?: "/scan";
}) {
  const isEdit = Boolean(bankroll);
  const t = useTranslations("bankrolls.drawer");
  const router = useRouter();
  const [state, action, pending] = useActionState(isEdit ? updateBankrollForm : createBankrollForm, undefined);
  const [mode, setMode] = useState<Mode>(bankroll?.mode ?? "SINGLE");
  const [initial, setInitial] = useState(String(bankroll?.initial ?? 0));
  const [allocations, setAllocations] = useState<AllocationDraft[]>(() => allocationDrafts(bankroll));
  const allocatedTotal = useMemo(() => allocations.reduce((sum, allocation) => sum + (Number(allocation.initial) || 0), 0), [allocations]);
  const allocationMismatch = mode === "DISTRIBUTED" && Math.abs(allocatedTotal - (Number(initial) || 0)) > 0.005;

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
      if (returnTo) router.push(returnTo);
    }
  }, [state, onOpenChange, returnTo, router]);

  const updateAllocation = (key: string, values: Partial<AllocationDraft>) => {
    setAllocations((current) => current.map((allocation) => allocation.key === key ? { ...allocation, ...values } : allocation));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="max-h-[92dvh] rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="text-base">{isEdit ? t("editTitle") : t("newTitle")}</DrawerTitle>
          <DrawerDescription>{isEdit ? t("editDescription") : t("newDescription")}</DrawerDescription>
        </DrawerHeader>
        <form action={action} className="flex flex-col gap-4 overflow-y-auto p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          {isEdit && <input type="hidden" name="id" value={bankroll?.id} />}
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="allocations" value={JSON.stringify(allocations.map(({ bookmaker, initial: amount }) => ({ bookmaker, initial: Number(amount) })))} />

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-name" className="text-xs">{t("nameLabel")}</Label>
            <Input id="br-name" name="name" placeholder={t("namePlaceholder")} defaultValue={bankroll?.name ?? ""} className="min-h-touch rounded-lg px-3 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-initial" className="text-xs">{t("initialLabel", { currency: currencySymbol(currency) })}</Label>
            <Input id="br-initial" name="initial" type="number" step="0.01" min="0" inputMode="decimal" required value={initial} onChange={(event) => setInitial(event.target.value)} className="num min-h-touch rounded-lg px-3 text-sm" />
            {isEdit && <p className="text-xs text-muted-foreground">{t("initialHint")}</p>}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium">{t("modeLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["SINGLE", "DISTRIBUTED"] as const).map((value) => {
                const Icon = value === "SINGLE" ? Wallet : Buildings;
                return <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("flex min-h-28 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors", mode === value ? "border-primary bg-primary/10" : "border-border bg-muted/20 text-muted-foreground")}>
                  <Icon size={22} weight={mode === value ? "fill" : "regular"} aria-hidden />
                  <span className="text-sm font-semibold">{t(`modes.${value}.title`)}</span>
                  <span className="text-xs leading-relaxed">{t(`modes.${value}.description`)}</span>
                </button>;
              })}
            </div>
          </fieldset>

          {mode === "DISTRIBUTED" && <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3">
            <div><h3 className="text-sm font-semibold">{t("allocationsTitle")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("allocationsDescription")}</p></div>
            <datalist id="known-bookmakers">{KNOWN_BOOKMAKERS.filter((bookmaker) => bookmaker !== "Autre").map((bookmaker) => <option key={bookmaker} value={bookmaker} />)}</datalist>
            {allocations.map((allocation, index) => <div key={allocation.key} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`allocation-bookmaker-${allocation.key}`} className="text-[0.65rem]">{t("bookmakerLabel")}</Label>
                <Input id={`allocation-bookmaker-${allocation.key}`} list="known-bookmakers" required value={allocation.bookmaker} onChange={(event) => updateAllocation(allocation.key, { bookmaker: event.target.value })} placeholder={t("bookmakerPlaceholder")} className="min-h-touch px-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`allocation-initial-${allocation.key}`} className="text-[0.65rem]">{t("allocationAmount", { currency: currencySymbol(currency) })}</Label>
                <Input id={`allocation-initial-${allocation.key}`} type="number" step="0.01" min="0" required value={allocation.initial} onChange={(event) => updateAllocation(allocation.key, { initial: event.target.value })} className="num min-h-touch px-2 text-sm" />
              </div>
              <Button type="button" variant="ghost" size="icon" disabled={allocations.length === 1} onClick={() => setAllocations((current) => current.filter((item) => item.key !== allocation.key))} aria-label={t("removeAllocation", { index: index + 1 })} className="min-h-touch min-w-touch text-loss"><Trash size={17} aria-hidden /></Button>
            </div>)}
            <Button type="button" variant="outline" onClick={() => setAllocations((current) => [...current, { key: crypto.randomUUID(), bookmaker: "", initial: "0" }])} className="min-h-touch w-full rounded-lg text-xs"><Plus size={16} aria-hidden />{t("addAllocation")}</Button>
            <p className={cn("text-xs", allocationMismatch ? "text-loss" : "text-muted-foreground")}>{t("allocatedTotal", { total: allocatedTotal.toFixed(2), currency: currencySymbol(currency) })}{allocationMismatch ? ` · ${t("allocatedMismatch")}` : ""}</p>
          </section>}

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-reference" className="text-xs">{t("referenceLabel", { currency: currencySymbol(currency) })}</Label>
            <Input id="br-reference" name="referenceCapital" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder={t("referencePlaceholder")} defaultValue={bankroll?.referenceCapital ?? ""} className="num min-h-touch rounded-lg px-3 text-sm" />
            <p className="text-xs leading-relaxed text-muted-foreground">{t("referenceHint")}</p>
          </div>
          {mode === "SINGLE" && isEdit && bankroll?.mode === "DISTRIBUTED" && <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">{t("singleHistoryHint")}</p>}
          {state?.error && <p role="alert" className="text-xs text-loss">{state.error}</p>}
          <Button type="submit" disabled={pending || allocationMismatch} className="min-h-touch w-full rounded-lg text-sm font-semibold">{pending ? t("submitting") : isEdit ? t("submitEdit") : t("submitCreate")}</Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
