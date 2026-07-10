"use client";

import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

// deleteAction est deleteBankroll(id) pré-lié côté serveur (bind) — le
// redirect vers /bankrolls se fait dans l'action elle-même, comme signOut.
export function DeleteBankrollDrawer({
  betCount,
  deleteAction,
  open,
  onOpenChange,
}: {
  betCount: number;
  deleteAction: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("bankrollDetail");
  const tCommon = useTranslations("common");

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="text-base">{t("deleteConfirmTitle")}</DrawerTitle>
          <DrawerDescription>
            {betCount > 0
              ? t("deleteConfirmWithBets", { count: betCount })
              : t("deleteConfirmNoBets")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <form action={deleteAction}>
            <Button
              type="submit"
              variant="destructive"
              className="min-h-touch w-full rounded-lg text-sm font-semibold"
            >
              {tCommon("delete")}
            </Button>
          </form>
          <Button
            variant="outline"
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
