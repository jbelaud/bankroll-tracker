import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  getPublicBookmakerSupportStatus,
  PRIORITY_MARKETING_BOOKMAKERS,
} from "@/lib/marketing-bookmakers";

function statusLabel(locale: Locale, status: "TESTED" | "UNTESTED" | "VALIDATING") {
  if (status === "TESTED") return locale === "fr" ? "Format testé" : "Tested format";
  if (status === "VALIDATING") return locale === "fr" ? "En validation" : "Being validated";
  return locale === "fr" ? "Non encore validé" : "Not yet validated";
}

function statusPresentation(status: "TESTED" | "UNTESTED" | "VALIDATING") {
  if (status === "TESTED") return { Icon: CheckCircle, className: "bg-profit/15 text-profit" };
  if (status === "VALIDATING") return { Icon: Info, className: "bg-primary/15 text-primary" };
  return { Icon: WarningCircle, className: "bg-warning/15 text-warning" };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing.meta.bookmakers" });
  return marketingMetadata({ locale, path: "/bookmakers", title: t("title"), description: t("description") });
}

export default async function BookmakersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // La connexion Prisma du runtime est volontairement limitée avec le pooler
  // Supabase. Cette page publique n'a que trois profils : une lecture
  // séquentielle évite une file d'attente inutile tout en gardant le statut
  // de l'administration comme source de vérité.
  const profiles = [] as Array<(typeof PRIORITY_MARKETING_BOOKMAKERS)[number] & {
    status: "TESTED" | "UNTESTED" | "VALIDATING";
  }>;
  for (const bookmaker of PRIORITY_MARKETING_BOOKMAKERS) {
    profiles.push({
      ...bookmaker,
      status: await getPublicBookmakerSupportStatus(bookmaker.bookmaker),
    });
  }

  return (
    <article className="py-12 sm:py-20 lg:py-24">
      <div className="kalivoa-content-frame">
        <header className="mx-auto max-w-3xl sm:text-center">
          <p className="marketing-eyebrow">{locale === "fr" ? "Compatibilité bookmaker" : "Bookmaker compatibility"}</p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] sm:mt-4 sm:text-5xl">
            {locale === "fr" ? "Quels bookmakers sont compatibles avec Kalivoa Scan ?" : "Which bookmakers work with Kalivoa Scan?"}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
            {locale === "fr"
              ? "Choisissez votre bookmaker pour connaître son niveau de prise en charge. Chaque capture reste vérifiable avant l’import."
              : "Choose your bookmaker to see its current support level. Every screenshot remains reviewable before import."}
          </p>
        </header>

        <section aria-label={locale === "fr" ? "Bookmakers disponibles" : "Available bookmakers"} className="mt-8 grid gap-3 sm:mt-12 md:grid-cols-3 md:gap-4">
          {profiles.map((profile) => {
            const presentation = statusPresentation(profile.status);
            const StatusIcon = presentation.Icon;
            return (
              <Link key={profile.slug} href={`/bookmakers/${profile.slug}`} locale={locale} className="marketing-card group flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 md:block md:p-6">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl md:mb-5 ${presentation.className}`}>
                  <StatusIcon size={22} weight="fill" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 md:block">
                    <h2 className="text-lg font-semibold md:text-xl">{profile.bookmaker}</h2>
                    <ArrowRight className="shrink-0 text-primary transition-transform group-hover:translate-x-1 md:hidden" size={18} weight="bold" aria-hidden />
                  </div>
                  <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:mt-2 md:text-xs">{statusLabel(locale, profile.status)}</span>
                  <span className="mt-3 hidden text-sm leading-6 text-muted-foreground md:block">
                    {locale === "fr" ? `Découvrir le suivi de paris ${profile.bookmaker} avec Kalivoa Scan.` : `Discover ${profile.bookmaker} bet tracking with Kalivoa Scan.`}
                  </span>
                  <span className="mt-5 hidden items-center gap-2 text-sm font-semibold text-primary md:inline-flex">
                    {locale === "fr" ? "Voir la page" : "View page"}
                    <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} weight="bold" aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card/40 p-4 sm:mt-10 sm:p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            {locale === "fr"
              ? "Kalivoa est indépendant et n’est affilié à aucun bookmaker. Les statuts évoluent uniquement à partir des validations réalisées pendant la bêta."
              : "Kalivoa is independent and is not affiliated with any bookmaker. Statuses only change based on validations completed during the beta."}
          </p>
          <Link href="/screenshot-import" locale={locale} className="marketing-text-link mt-3 text-sm">
            {locale === "fr" ? "Comprendre l’import par capture" : "Learn how screenshot import works"}
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
