import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { marketingMetadata } from "@/lib/marketing-seo";
import { Link } from "@/i18n/navigation";
import {
  getPublicBookmakerSupportStatus,
  PRIORITY_MARKETING_BOOKMAKERS,
} from "@/lib/marketing-bookmakers";

function statusLabel(locale: Locale, status: "TESTED" | "UNTESTED" | "VALIDATING") {
  if (status === "TESTED") return locale === "fr" ? "Format testé" : "Tested format";
  if (status === "VALIDATING") return locale === "fr" ? "En validation" : "Being validated";
  return locale === "fr" ? "Non encore validé" : "Not yet validated";
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
    <article className="marketing-section">
      <div className="marketing-container">
        <header className="mx-auto max-w-3xl text-center">
          <p className="marketing-eyebrow">{locale === "fr" ? "Compatibilité bookmaker" : "Bookmaker compatibility"}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {locale === "fr" ? "Suivez vos paris par capture, bookmaker par bookmaker." : "Track your bets from screenshots, bookmaker by bookmaker."}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {locale === "fr"
              ? "Kalivoa Scan prépare un import à vérifier : le statut affiché vient de l’administration et n’est jamais remplacé par une promesse marketing."
              : "Kalivoa Scan prepares an import for review: the displayed status comes from administration and is never replaced by a marketing promise."}
          </p>
        </header>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {profiles.map((profile) => (
            <Link key={profile.slug} href={`/bookmakers/${profile.slug}`} locale={locale} className="marketing-card p-6 transition-transform hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{statusLabel(locale, profile.status)}</p>
              <h2 className="mt-4 text-xl font-semibold">{profile.bookmaker}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {locale === "fr" ? `Découvrir le suivi de paris ${profile.bookmaker} avec Kalivoa Scan.` : `Discover ${profile.bookmaker} bet tracking with Kalivoa Scan.`}
              </p>
              <span className="mt-5 inline-block text-sm font-semibold text-primary">{locale === "fr" ? "Voir la page" : "View page"} →</span>
            </Link>
          ))}
        </section>

        <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
          {locale === "fr"
            ? "Kalivoa est indépendant et n’est affilié à aucun bookmaker. Les métriques de captures testées et d’imports sans correction seront publiées uniquement lorsqu’elles seront représentatives."
            : "Kalivoa is independent and is not affiliated with any bookmaker. Tested screenshot and correction-free import metrics will only be published once representative."}
        </p>
      </div>
    </article>
  );
}
