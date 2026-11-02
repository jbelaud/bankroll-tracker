"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveEmailMarketingPreference } from "@/lib/email-marketing/preferences";

export type EmailMarketingFormState = { status: "idle" | "saved" | "error"; enabled?: boolean };

export async function updateEmailMarketingPreference(
  _previous: EmailMarketingFormState, form: FormData,
): Promise<EmailMarketingFormState> {
  try {
    const user = await requireUser();
    if (!user.email) return { status: "error" };
    const source = form.get("source");
    const locale = form.get("locale");
    const intent = form.get("intent");
    if ((source !== "account" && source !== "post_login") ||
        (locale !== "fr" && locale !== "en") ||
        (intent !== "save" && intent !== "decline")) return { status: "error" };
    // An absent checkbox is refusal, never implied consent.
    const enabled = intent === "save" && form.get("marketingEmail") === "yes";
    await saveEmailMarketingPreference({ id: user.id, email: user.email }, enabled, locale, source);
    revalidatePath("/[locale]", "layout");
    return { status: "saved", enabled };
  } catch {
    return { status: "error" };
  }
}
