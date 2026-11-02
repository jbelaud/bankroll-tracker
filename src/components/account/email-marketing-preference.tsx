"use client";

import { useActionState, useId } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { updateEmailMarketingPreference, type EmailMarketingFormState } from "@/lib/actions/email-marketing";
import { emailMarketingCopy } from "@/lib/email-marketing/copy";

const initialState: EmailMarketingFormState = { status: "idle" };

export function EmailMarketingPreference({ locale, enabled = false, prompt = false }: {
  locale: "fr" | "en"; enabled?: boolean; prompt?: boolean;
}) {
  const [state, action, pending] = useActionState(updateEmailMarketingPreference, initialState);
  const id = useId();
  const pathname = usePathname();
  const copy = emailMarketingCopy(locale);
  if (prompt && (state.status === "saved" || pathname.includes("/account"))) return null;

  return <section aria-labelledby={`${id}-title`} className="my-4 rounded-xl border border-border bg-card p-4">
    <h2 id={`${id}-title`} className="text-sm font-semibold">{copy.title}</h2>
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={prompt ? "post_login" : "account"} />
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
        <input key={String(state.enabled ?? enabled)} name="marketingEmail" type="checkbox" value="yes"
          defaultChecked={state.enabled ?? enabled} disabled={pending} aria-describedby={`${id}-hint`}
          className="mt-1 size-4 shrink-0 accent-primary" />
        <span>{copy.label}</span>
      </label>
      <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">{copy.hint} {" "}
        <Link href="/privacy" className="underline">{copy.privacy}</Link>
      </p>
      <div className="flex flex-wrap gap-3">
        <button name="intent" value="save" disabled={pending} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? copy.saving : copy.save}</button>
        {prompt && <button name="intent" value="decline" disabled={pending} className="min-h-11 rounded-lg border border-border px-4 text-sm disabled:opacity-50">{copy.decline}</button>}
      </div>
      {state.status === "saved" && !prompt && <p role="status" className="text-sm text-profit">{copy.saved}</p>}
      {state.status === "error" && <p role="alert" className="text-sm text-loss">{copy.error}</p>}
    </form>
  </section>;
}
