"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { prisma } from "@/lib/prisma";

export type FeedbackState = {
  error?: string;
  success?: boolean;
};

const MAX_MESSAGE_LENGTH = 2_000;
const allowedCategories = new Set(["BUG", "IDEA", "OTHER"]);

export async function submitFeedback(
  _previousState: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const locale = await getServerLocale();
  const t = await getTranslations({ locale, namespace: "feedback" });
  const user = await requireUser();
  const message = String(formData.get("message") ?? "").trim();
  const rawCategory = String(formData.get("category") ?? "BUG");
  const page = String(formData.get("page") ?? "").trim();

  if (message.length < 8) return { error: t("errorTooShort") };
  if (message.length > MAX_MESSAGE_LENGTH) return { error: t("errorTooLong") };
  if (!allowedCategories.has(rawCategory)) return { error: t("errorCategory") };

  await prisma.feedback.create({
    data: {
      userId: user.id,
      category: rawCategory as "BUG" | "IDEA" | "OTHER",
      message,
      page: page.slice(0, 250) || null,
    },
  });

  revalidatePath("/[locale]/admin", "page");
  return { success: true };
}
