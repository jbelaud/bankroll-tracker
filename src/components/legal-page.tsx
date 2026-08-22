import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type LegalKind = "privacy" | "terms" | "responsible";
type Section = { title: string; paragraphs: string[] };

const copy: Record<LegalKind, Record<"fr" | "en", { title: string; intro: string; sections: Section[] }>> = {
  privacy: {
    fr: {
      title: "Confidentialité",
      intro: "Cette page explique simplement quelles données BetTrack utilise pour fournir le suivi de bankroll.",
      sections: [
        { title: "Données utilisées", paragraphs: ["Nous traitons les données de compte, tes bankrolls, tes paris, tes préférences et les retours que tu nous envoies.", "Les captures de tickets sont transmises au fournisseur IA choisi pour extraire les paris. BetTrack ne les conserve pas après l’analyse."] },
        { title: "Pourquoi", paragraphs: ["Ces données servent à authentifier ton compte, afficher tes statistiques, analyser tes captures, appliquer tes limites de scans et assurer le support.", "Les paiements sont traités par Stripe. BetTrack ne reçoit ni ne stocke ton numéro de carte bancaire."] },
        { title: "Tes choix", paragraphs: ["Tu peux exporter tes données depuis Compte > Mes données. Pour demander la suppression de ton compte ou exercer un droit d’accès, utilise le formulaire de retour bêta dans l’application."] },
        { title: "Sécurité", paragraphs: ["Les accès sont protégés par une session authentifiée. Les données ne sont pas vendues. Cette politique pourra évoluer à mesure que le service quitte sa phase bêta."] },
      ],
    },
    en: {
      title: "Privacy",
      intro: "This page plainly explains which data BetTrack uses to provide bankroll tracking.",
      sections: [
        { title: "Data we use", paragraphs: ["We process account data, bankrolls, bets, preferences and the feedback you send us.", "Ticket screenshots are sent to the selected AI provider to extract bets. BetTrack does not retain them after analysis."] },
        { title: "Why", paragraphs: ["This data authenticates your account, displays statistics, analyzes screenshots, applies scan limits and provides support.", "Payments are processed by Stripe. BetTrack never receives or stores your card number."] },
        { title: "Your choices", paragraphs: ["You can export your data from Account > My data. To request account deletion or exercise an access right, use the beta feedback form in the app."] },
        { title: "Security", paragraphs: ["Access is protected by an authenticated session. Your data is not sold. This policy may evolve as the service leaves beta."] },
      ],
    },
  },
  terms: {
    fr: {
      title: "Conditions d’utilisation",
      intro: "BetTrack est un outil personnel de suivi et d’analyse de paris sportifs.",
      sections: [
        { title: "Ce que fait BetTrack", paragraphs: ["Le service aide à saisir, organiser et visualiser tes paris. Les extractions par IA doivent toujours être vérifiées avant import.", "BetTrack ne fournit aucun conseil de pari, aucune promesse de gain et ne transmet pas de paris à un bookmaker."] },
        { title: "Usage responsable", paragraphs: ["Le service est réservé aux personnes majeures. Ne joue jamais des sommes que tu ne peux pas perdre et fixe des limites adaptées à ta situation.", "Si le jeu prend trop de place, fais une pause et contacte Joueurs Info Service."] },
        { title: "Compte et abonnement", paragraphs: ["Tu es responsable de l’exactitude des informations ajoutées à ton compte et de la confidentialité de tes identifiants.", "Les fonctions payantes, les tarifs et les limites applicables sont affichés avant tout paiement."] },
        { title: "Phase bêta", paragraphs: ["Le service évolue rapidement. Signale tout problème rencontré via le formulaire de retour bêta afin de nous aider à l’améliorer."] },
      ],
    },
    en: {
      title: "Terms of use",
      intro: "BetTrack is a personal tool for tracking and analyzing sports bets.",
      sections: [
        { title: "What BetTrack does", paragraphs: ["The service helps you enter, organize and view your bets. AI extractions must always be checked before importing.", "BetTrack does not provide betting advice, promise gains, or place bets with bookmakers."] },
        { title: "Responsible use", paragraphs: ["The service is for adults only. Never bet money you cannot afford to lose and set limits that suit your situation.", "If gambling takes too much space in your life, take a break and contact a local support service."] },
        { title: "Account and subscription", paragraphs: ["You are responsible for the accuracy of information added to your account and for keeping your credentials private.", "Paid features, applicable prices and limits are displayed before payment."] },
        { title: "Beta phase", paragraphs: ["The service evolves quickly. Report any issue through the beta feedback form to help us improve it."] },
      ],
    },
  },
  responsible: {
    fr: {
      title: "Jouer responsable",
      intro: "Le suivi de bankroll doit t’aider à garder le contrôle, jamais à jouer davantage.",
      sections: [
        { title: "Garde des limites", paragraphs: ["Définis un budget dédié, fixe une limite de perte mensuelle dans BetTrack et respecte-la. Une série de pertes ne doit jamais être compensée par une mise plus importante."] },
        { title: "Fais une pause", paragraphs: ["Si le jeu te stresse, prend trop de temps ou affecte tes proches et tes finances, éloigne-toi des paris et demande de l’aide."] },
        { title: "Parler à quelqu’un", paragraphs: ["En France, Joueurs Info Service répond au 09 74 75 13 13 et sur joueurs-info-service.fr. Le service est anonyme et non surtaxé."] },
      ],
    },
    en: {
      title: "Responsible gambling",
      intro: "Bankroll tracking should help you stay in control, never encourage you to gamble more.",
      sections: [
        { title: "Keep limits", paragraphs: ["Set a dedicated budget, create a monthly loss limit in BetTrack and stick to it. A losing streak should never be chased with a larger stake."] },
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
          <h2 className="text-sm font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-2 text-xs leading-relaxed text-muted-foreground">{paragraph}</p>)}
        </section>
      ))}
      <Link href="/" locale={locale} className="min-h-touch rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold">
        {backLabel}
      </Link>
    </article>
  );
}
