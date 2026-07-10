"use client";

import { useActionState, useEffect } from "react";
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
            <Input
              id="br-bookmaker"
              name="bookmaker"
              required
              placeholder={t("bookmakerPlaceholder")}
              defaultValue={bankroll?.bookmaker ?? ""}
              className="min-h-touch rounded-lg px-3 text-sm"
            />
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
