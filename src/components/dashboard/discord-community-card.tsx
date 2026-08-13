import { getTranslations } from "next-intl/server";
import { ArrowSquareOutIcon, DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";

const DISCORD_INVITE_URL = "https://discord.gg/aMc8jDAAx";

export async function DiscordCommunityCard() {
  const t = await getTranslations("dashboard.community");

  return (
    <section aria-label={t("title")} className="glass-card flex items-center justify-between gap-3 rounded-xl p-4">
      <div className="flex min-w-0 gap-3">
        <DiscordLogoIcon size={24} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-touch shrink-0 items-center gap-1.5 rounded-lg border border-primary/35 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        {t("join")}
        <ArrowSquareOutIcon size={15} aria-hidden />
      </a>
    </section>
  );
}
