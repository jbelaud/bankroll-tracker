"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencySymbol } from "@/lib/format";
import {
  createBankrollForm,
  updateBankrollForm,
} from "@/lib/actions/bankroll-forms";
import { KNOWN_BOOKMAKERS } from "@/lib/bookmakers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MANUAL_BOOKMAKER = "__manual__";
const SELECTABLE_BOOKMAKERS = KNOWN_BOOKMAKERS.filter((bookmaker) => bookmaker !== "Autre");
const TESTED_BOOKMAKERS = new Set(["Winamax", "Betclic"]);

function initialBookmakerSelection(bookmaker?: string): string {
  if (!bookmaker) return "";
  return bookmaker && SELECTABLE_BOOKMAKERS.includes(bookmaker as (typeof SELECTABLE_BOOKMAKERS)[number])
    ? bookmaker
    : MANUAL_BOOKMAKER;
}

export type BankrollFormTarget = {
  id: string;
  name: string;
  bookmaker: string;
  initial: number;
};

export function BankrollFormDrawer({
  open,
  onOpenChange,
  bankroll,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankroll?: BankrollFormTarget; // absent = création
  currency: Currency;
}) {
  const isEdit = !!bankroll;
  const t = useTranslations("bankrolls.drawer");
  const [state, action, pending] = useActionState(
    isEdit ? updateBankrollForm : createBankrollForm,
    undefined
  );
  const [selectedBookmaker, setSelectedBookmaker] = useState(() => initialBookmakerSelection(bankroll?.bookmaker));
  const [manualBookmaker, setManualBookmaker] = useState(
    bankroll && initialBookmakerSelection(bankroll.bookmaker) === MANUAL_BOOKMAKER ? bankroll.bookmaker : ""
  );

  useEffect(() => {
    if (state?.success) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="text-base">
            {isEdit ? t("editTitle") : t("newTitle")}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit ? t("editDescription") : t("newDescription")}
          </DrawerDescription>
        </DrawerHeader>

        <form
          action={action}
          className="flex flex-col gap-4 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
        >
          {isEdit && <input type="hidden" name="id" value={bankroll.id} />}

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-bookmaker" className="text-xs">
              {t("bookmakerLabel")}
            </Label>
            <input
              type="hidden"
              name="bookmaker"
              value={selectedBookmaker === MANUAL_BOOKMAKER ? manualBookmaker : selectedBookmaker}
            />
            <Select value={selectedBookmaker} onValueChange={(value) => setSelectedBookmaker(value as string)}>
              <SelectTrigger id="br-bookmaker" className="min-h-touch w-full rounded-lg px-3 text-sm">
                <SelectValue placeholder={t("bookmakerChoose")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t("bookmakerTested")}</SelectLabel>
                  {SELECTABLE_BOOKMAKERS.filter((bookmaker) => TESTED_BOOKMAKERS.has(bookmaker)).map((bookmaker) => (
                    <SelectItem key={bookmaker} value={bookmaker}>{bookmaker}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>{t("bookmakerKnown")}</SelectLabel>
                  {SELECTABLE_BOOKMAKERS.filter((bookmaker) => !TESTED_BOOKMAKERS.has(bookmaker)).map((bookmaker) => (
                    <SelectItem key={bookmaker} value={bookmaker}>{bookmaker}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectItem value={MANUAL_BOOKMAKER}>{t("bookmakerManual")}</SelectItem>
              </SelectContent>
            </Select>
            {selectedBookmaker === MANUAL_BOOKMAKER && (
              <Input
                id="br-bookmaker-manual"
                required
                value={manualBookmaker}
                onChange={(event) => setManualBookmaker(event.target.value)}
                placeholder={t("bookmakerManualPlaceholder")}
                className="min-h-touch rounded-lg px-3 text-sm"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-name" className="text-xs">
              {t("nameLabel")}
            </Label>
            <Input
              id="br-name"
              name="name"
              placeholder={t("namePlaceholder")}
              defaultValue={bankroll?.name ?? ""}
              className="min-h-touch rounded-lg px-3 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="br-initial" className="text-xs">
              {t("initialLabel", { currency: currencySymbol(currency) })}
            </Label>
            <Input
              id="br-initial"
              name="initial"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              placeholder="100.00"
              defaultValue={bankroll ? String(bankroll.initial) : ""}
              className="num min-h-touch rounded-lg px-3 text-sm"
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">{t("initialHint")}</p>
            )}
          </div>

          {state?.error && (
            <p role="alert" className="text-xs text-loss">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="min-h-touch w-full rounded-lg text-sm font-semibold"
          >
            {pending
              ? t("submitting")
              : isEdit
                ? t("submitEdit")
                : t("submitCreate")}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
