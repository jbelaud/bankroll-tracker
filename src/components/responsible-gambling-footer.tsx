import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function ResponsibleGamblingFooter() {
  const t = await getTranslations("footer");
  const locale = await getLocale();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <div className="mx-auto flex h-[var(--rg-footer-h)] max-w-md flex-col items-center justify-center px-3 text-center text-[0.6rem] text-muted-foreground lg:max-w-none lg:pl-64">
        <p>
          {t("label")}{" "}
          <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            joueurs-info-service.fr
          </a>{" "}
          · 09 74 75 13 13
        </p>
        <p className="mt-0.5 flex gap-2">
          <Link href="/privacy" locale={locale}>{t("privacy")}</Link>
          <span aria-hidden>·</span>
          <Link href="/terms" locale={locale}>{t("terms")}</Link>
          <span aria-hidden>·</span>
          <Link href="/responsible-gambling" locale={locale}>{t("responsible")}</Link>
        </p>
      </div>
    </footer>
  );
}
