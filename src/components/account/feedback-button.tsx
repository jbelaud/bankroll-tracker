"use client";

import { useActionState, useState } from "react";
import { ChatCircleText, CircleNotch } from "@phosphor-icons/react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { submitFeedback, type FeedbackState } from "@/lib/actions/feedback";

const initialState: FeedbackState = {};

export function FeedbackButton() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="min-h-touch w-full rounded-lg text-sm"
      >
        <ChatCircleText size={17} aria-hidden />
        {t("open")}
      </Button>

      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent className="rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle className="text-base">{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <FeedbackForm
            key={formVersion}
            onDone={() => {
              setOpen(false);
              setFormVersion((version) => version + 1);
            }}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function FeedbackForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("feedback");
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <p className="rounded-lg bg-win-muted p-3 text-sm text-win">{t("success")}</p>
        <Button onClick={onDone} className="min-h-touch w-full rounded-lg text-sm font-semibold">
          {t("close")}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 p-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <input type="hidden" name="page" value={pathname} />
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="feedback-category">
        {t("category")}
        <select id="feedback-category" name="category" defaultValue="BUG" className="h-11 rounded-lg border border-border bg-input px-3 text-sm font-normal">
          <option value="BUG">{t("categories.bug")}</option>
          <option value="IDEA">{t("categories.idea")}</option>
          <option value="OTHER">{t("categories.other")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="feedback-message">
        {t("message")}
        <textarea
          id="feedback-message"
          name="message"
          required
          minLength={8}
          maxLength={2000}
          rows={5}
          placeholder={t("placeholder")}
          className="resize-none rounded-lg border border-border bg-input p-3 text-sm font-normal outline-none focus:border-primary"
        />
      </label>
      {state.error && <p role="alert" className="text-xs text-loss">{state.error}</p>}
      <Button type="submit" disabled={pending} className="min-h-touch w-full rounded-lg text-sm font-semibold">
        {pending ? <CircleNotch size={16} className="animate-spin" aria-hidden /> : <ChatCircleText size={16} aria-hidden />}
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
