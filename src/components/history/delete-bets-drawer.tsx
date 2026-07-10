"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

// Confirmation générique pour 1 pari (swipe) ou N paris (sélection groupée) —
// jamais de suppression directe au premier geste, toujours ce palier explicite.
export function DeleteBetsDrawer({
  count,
  open,
  onOpenChange,
  onConfirm,
}: {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const t = useTranslations("history.deleteDrawer");
  const tCommon = useTranslations("common");

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
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
        <div className="flex flex-col gap-2 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleConfirm}
            className="min-h-touch w-full rounded-lg text-sm font-semibold"
          >
            {deleting
              ? t("deleting")
              : count > 1
                ? t("confirmPlural", { count })
                : t("confirmSingle")}
          </Button>
          <Button
            variant="outline"
            disabled={deleting}
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
