"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Currency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBankrollMovementForm } from "@/lib/actions/bankroll-movement-forms";
import { deleteBankrollMovement } from "@/lib/actions/bankroll-movements";

type MovementItem = { id: string; type: "DEPOSIT" | "WITHDRAWAL"; amount: number; note: string | null; date: string };

export function BankrollMovementPanel({
  bankrollId,
  movements,
  currency,
  locale,
  today,
}: {
  bankrollId: string;
  movements: MovementItem[];
  currency: Currency;
  locale: string;
  today: string;
}) {
  const t = useTranslations("bankrollDetail");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createBankrollMovementForm, undefined);
  const [deleting, startTransition] = useTransition();

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state?.success]);

  const formatMoney = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  const formatDate = (date: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

  return (
    <section className="glass-card rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("movementsTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("movementsDescription")}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>{t("addMovement")}</Button>
      </div>

      {movements.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">{t("noMovements")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {movements.map((movement) => {
            const withdrawal = movement.type === "WITHDRAWAL";
            return (
              <li key={movement.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{t(`movementTypes.${movement.type}`)}</p>
                  <p className="truncate text-xs text-muted-foreground">{movement.note || formatDate(movement.date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <strong className={`num text-sm ${withdrawal ? "text-loss" : "text-profit"}`}>{withdrawal ? "−" : "+"}{formatMoney(movement.amount)}</strong>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={deleting}
                    onClick={() => {
                      if (!window.confirm(t("deleteMovementConfirm"))) return;
                      startTransition(async () => {
                        await deleteBankrollMovement(movement.id);
                        router.refresh();
                      });
                    }}
                  >
                    {t("deleteMovement")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle className="text-base">{t("movementDrawerTitle")}</DrawerTitle>
            <DrawerDescription>{t("movementDrawerDescription")}</DrawerDescription>
          </DrawerHeader>
          <form action={action} className="flex flex-col gap-4 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <input type="hidden" name="bankrollId" value={bankrollId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-type" className="text-xs">{t("movementTypeLabel")}</Label>
              <select id="movement-type" name="type" defaultValue="DEPOSIT" className="min-h-touch rounded-lg border border-input bg-background px-3 text-sm">
                <option value="DEPOSIT">{t("movementTypes.DEPOSIT")}</option>
                <option value="WITHDRAWAL">{t("movementTypes.WITHDRAWAL")}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-amount" className="text-xs">{t("movementAmountLabel")}</Label>
              <Input id="movement-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required placeholder="100.00" className="num min-h-touch rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-date" className="text-xs">{t("movementDateLabel")}</Label>
              <Input id="movement-date" name="date" type="date" defaultValue={today} required className="min-h-touch rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="movement-note" className="text-xs">{t("movementNoteLabel")}</Label>
              <Input id="movement-note" name="note" maxLength={280} placeholder={t("movementNotePlaceholder")} className="min-h-touch rounded-lg" />
            </div>
            {state?.error && <p role="alert" className="text-xs text-loss">{state.error}</p>}
            <Button type="submit" disabled={pending} className="min-h-touch rounded-lg font-semibold">{pending ? t("movementSubmitting") : t("movementSubmit")}</Button>
          </form>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
