import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { privacyContent } from "@/lib/legal/privacy-content";

type LegalKind = "privacy" | "terms" | "responsible";
type Section = { title: string; paragraphs: string[] };

const copy: Record<LegalKind, Record<"fr" | "en", { title: string; intro: string; sections: Section[] }>> = {
  privacy: privacyContent,
  terms: {
    fr: {
      title: "Conditions d’utilisation",
      intro: "Kalivoa est un outil personnel de suivi et d’analyse de paris sportifs.",
      sections: [
        { title: "Ce que fait Kalivoa", paragraphs: ["Le service aide à saisir, organiser et visualiser tes paris. Les extractions par IA doivent toujours être vérifiées avant import.", "Kalivoa ne fournit aucun conseil de pari, aucune promesse de gain et ne transmet pas de paris à un bookmaker."] },
        { title: "Usage responsable", paragraphs: ["Le service est réservé aux personnes majeures. Ne joue jamais des sommes que tu ne peux pas perdre et fixe des limites adaptées à ta situation.", "Si le jeu prend trop de place, fais une pause et contacte Joueurs Info Service."] },
        { title: "Compte et abonnement", paragraphs: ["Tu es responsable de l’exactitude des informations ajoutées à ton compte et de la confidentialité de tes identifiants.", "La bêta est actuellement gratuite. Les offres présentées pour la suite ne déclenchent aucun paiement : une souscription payante demandera une commande et l’acceptation distincte des conditions générales de vente à l’ouverture des abonnements."] },
        { title: "Publication et certification", paragraphs: ["Une bankroll est privée par défaut. Si tu choisis de la publier, les informations de la page partagée deviennent accessibles aux visiteurs. La certification décrit les preuves enregistrées et le journal des corrections ; elle ne garantit ni l’authenticité absolue d’un ticket, ni la rentabilité, ni le solde réel d’un compte bookmaker."] },
        { title: "Phase bêta", paragraphs: ["Le service évolue rapidement. Signale tout problème rencontré via le formulaire de retour bêta afin de nous aider à l’améliorer."] },
      ],
    },
    en: {
      title: "Terms of use",
      intro: "Kalivoa is a personal tool for tracking and analyzing sports bets.",
      sections: [
        { title: "What Kalivoa does", paragraphs: ["The service helps you enter, organize and view your bets. AI extractions must always be checked before importing.", "Kalivoa does not provide betting advice, promise gains, or place bets with bookmakers."] },
        { title: "Responsible use", paragraphs: ["The service is for adults only. Never bet money you cannot afford to lose and set limits that suit your situation.", "If gambling takes too much space in your life, take a break and contact a local support service."] },
        { title: "Account and subscription", paragraphs: ["You are responsible for the accuracy of information added to your account and for keeping your credentials private.", "Beta is currently free. Plans presented for the future do not trigger payment: a paid subscription will require an order and separate acceptance of the sales terms after subscriptions open."] },
        { title: "Publication and certification", paragraphs: ["Bankrolls are private by default. If you publish one, the information on its shared page becomes accessible to visitors. Certification describes recorded evidence and the correction journal; it does not guarantee absolute ticket authenticity, profitability or actual bookmaker balances."] },
        { title: "Beta phase", paragraphs: ["The service evolves quickly. Report any issue through the beta feedback form to help us improve it."] },
      ],
    },
  },
  responsible: {
    fr: {
      title: "Jouer responsable",
      intro: "Le suivi de bankroll doit t’aider à garder le contrôle, jamais à jouer davantage.",
      sections: [
        { title: "Garde des limites", paragraphs: ["Définis un budget dédié, fixe une limite de perte mensuelle dans Kalivoa et respecte-la. Une série de pertes ne doit jamais être compensée par une mise plus importante."] },
        { title: "Fais une pause", paragraphs: ["Si le jeu te stresse, prend trop de temps ou affecte tes proches et tes finances, éloigne-toi des paris et demande de l’aide."] },
        { title: "Parler à quelqu’un", paragraphs: ["En France, Joueurs Info Service répond au 09 74 75 13 13 et sur joueurs-info-service.fr. Le service est anonyme et non surtaxé."] },
      ],
    },
    en: {
      title: "Responsible gambling",
      intro: "Bankroll tracking should help you stay in control, never encourage you to gamble more.",
      sections: [
        { title: "Keep limits", paragraphs: ["Set a dedicated budget, create a monthly loss limit in Kalivoa and stick to it. A losing streak should never be chased with a larger stake."] },
        { title: "Take a break", paragraphs: ["If gambling causes stress, takes too much time or affects loved ones and finances, step away from betting and seek help."] },
        { title: "Talk to someone", paragraphs: ["In France, Joueurs Info Service is available at 09 74 75 13 13 and joueurs-info-service.fr. If you are elsewhere, contact a local gambling support service."] },
      ],
    },
  },
};

export function LegalPage({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  const language = locale === "en" ? "en" : "fr";
  const page = copy[kind][language];
  const backLabel = language === "en" ? "Back to home" : "Retour à l’accueil";

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-12 sm:py-16">
      <header>
        <h1 className="text-2xl font-semibold">{page.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{page.intro}</p>
      </header>
      {page.sections.map((section) => (
        <section key={section.title} className="glass-card rounded-xl p-4">
          <h2 className="text-base font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>)}
        </section>
      ))}
      {kind === "terms" && <nav aria-label={language === "fr" ? "Documents complémentaires" : "Related documents"} className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-primary underline underline-offset-4"><Link href="/sales-terms" locale={locale}>{language === "fr" ? "Conditions générales de vente" : "Sales terms"}</Link><Link href="/certification" locale={locale}>{language === "fr" ? "Comprendre la certification" : "Understand certification"}</Link><Link href="/privacy" locale={locale}>{language === "fr" ? "Confidentialité" : "Privacy"}</Link></nav>}
      <Link href="/" locale={locale} className="min-h-touch rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold">
        {backLabel}
      </Link>
    </article>
  );
}
