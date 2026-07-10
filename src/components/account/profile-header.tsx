import { getTranslations } from "next-intl/server";

export async function ProfileHeader({ email }: { email: string }) {
  const initial = email.trim().charAt(0).toUpperCase() || "?";
  const t = await getTranslations("account");

  return (
    <section aria-label={t("profileAriaLabel")} className="glass-card flex items-center gap-3 rounded-xl p-4">
      <div
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
      >
        {initial}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-muted-foreground">{t("connectedAs")}</span>
        <span className="truncate text-sm font-semibold">{email}</span>
      </div>
    </section>
  );
}
