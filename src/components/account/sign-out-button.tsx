"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SignOut } from "@phosphor-icons/react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

// Pattern mobile-natif : le tap ouvre une feuille de confirmation (comme
// une action sheet iOS) — jamais de déconnexion au premier tap.
export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("account.signOut");
  const tCommon = useTranslations("common");

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="destructive"
        className="min-h-touch w-full rounded-lg border border-loss/40 bg-loss-muted text-sm font-medium text-loss"
      >
        <SignOut size={16} aria-hidden />
        {t("button")}
      </Button>

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle className="text-base">{t("confirmTitle")}</DrawerTitle>
            <DrawerDescription>{t("confirmDescription")}</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <form action={signOut}>
              <Button
                type="submit"
                variant="destructive"
                className="min-h-touch w-full rounded-lg text-sm font-semibold"
              >
                {t("confirm")}
              </Button>
            </form>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="min-h-touch w-full rounded-lg text-sm"
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
