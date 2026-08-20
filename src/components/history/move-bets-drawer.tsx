"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MoveBetsDrawer({
  count,
  bankrollOptions,
  open,
  onOpenChange,
  onConfirm,
}: {
  count: number;
  bankrollOptions: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetBankrollId: string) => Promise<void>;
}) {
  const [targetBankrollId, setTargetBankrollId] = useState("");
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("history.moveDrawer");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!open) return;
    setTargetBankrollId(bankrollOptions[0]?.id ?? "");
    setError("");
  }, [open, bankrollOptions]);

  const handleConfirm = async () => {
    if (!targetBankrollId) return;
    setMoving(true);
    setError("");
    try {
      await onConfirm(targetBankrollId);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tCommon("unexpectedError"));
    } finally {
      setMoving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="text-base">
            {count > 1 ? t("titlePlural", { count }) : t("titleSingle")}
          </DrawerTitle>
          <DrawerDescription>{t("description")}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-3 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <label htmlFor="move-bankroll" className="text-xs font-medium">
            {t("bankrollLabel")}
          </label>
          <Select
            value={targetBankrollId}
            onValueChange={(value) => setTargetBankrollId(value as string)}
            disabled={moving}
            items={Object.fromEntries(bankrollOptions.map((bankroll) => [bankroll.id, bankroll.name]))}
          >
            <SelectTrigger id="move-bankroll" className="min-h-touch w-full rounded-lg px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bankrollOptions.map((bankroll) => (
                <SelectItem key={bankroll.id} value={bankroll.id} className="min-h-touch text-sm">
                  {bankroll.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? <p role="alert" className="text-xs text-loss">{error}</p> : null}
          <Button
            disabled={moving || !targetBankrollId}
            onClick={handleConfirm}
            className="min-h-touch w-full rounded-lg text-sm font-semibold"
          >
            {moving ? t("moving") : count > 1 ? t("confirmPlural", { count }) : t("confirmSingle")}
          </Button>
          <Button
            variant="outline"
            disabled={moving}
            onClick={() => onOpenChange(false)}
            className="min-h-touch w-full rounded-lg text-sm"
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
