import { ArrowRight, CheckCircle, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { BookmakerSupportStatus } from "@/lib/scan/bookmaker-profile";

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  problemTitle: string;
  problem: string;
  scanTitle: string;
  scan: string;
  stepsTitle: string;
  steps: Array<{ title: string; description: string }>;
  demoTitle: string;
  demo: string;
  formatsTitle: string;
  formats: string;
  faqTitle: string;
  faq: Array<{ question: string; answer: string }>;
  cta: string;
  dataTitle: string;
  data: string;
  independent: string;
};

function copyFor(locale: Locale, bookmaker: string): Copy {
  if (locale === "en") {
    return {
      eyebrow: `${bookmaker} betting tracker`,
      title: `Track your ${bookmaker} bets without entering them one by one`,
      lead: `Select a screenshot of your ${bookmaker} betting slip. Kalivoa Scan extracts the visible bets, then lets you check every detail before importing them into your bankroll.`,
      problemTitle: "Manual entry hides the useful part of tracking",
      problem: "Re-entering a bet, its odds and stake after every slip takes time. That friction makes a betting history incomplete and your statistics less useful.",
      scanTitle: "Kalivoa Scan keeps you in control",
      scan: "A screenshot is analysed only to prepare an import. Nothing is added automatically: you can correct a field, remove a bet, exclude it, and review duplicate or bookmaker mismatch warnings.",
      stepsTitle: "How it works",
      steps: [
        { title: "1. Select your screenshots", description: `Choose one or more ${bookmaker} ticket screenshots from your phone or computer.` },
        { title: "2. Check the extraction", description: "Review the detected bets and correct only what needs correcting." },
        { title: "3. Import into your bankroll", description: "Confirm the bets to update your history and statistics." },
      ],
      demoTitle: "The first useful result",
      demo: "The intended flow is simple: screenshots → review → import → updated bankroll and stats. A real product demonstration will be added only after representative beta tickets are available.",
      formatsTitle: "Supported formats during beta",
      formats: "Kalivoa focuses on readable betting-slip screenshots. Singles, accumulators and visible settled or open tickets can be presented for review when their information is readable; every import remains subject to your validation.",
      faqTitle: "Frequently asked questions",
      faq: [
        { question: `Do I need to type my ${bookmaker} bets?`, answer: "No. The goal is to start from a screenshot, then validate the proposed data before it is saved." },
        { question: "Is the import automatic?", answer: "No. The mandatory review screen lets you edit, remove or exclude any proposed bet before import." },
        { question: "Can I use more than one bookmaker?", answer: "Yes. You can keep separate bankrolls by bookmaker. Kalivoa warns you if a ticket does not match the selected bankroll." },
      ],
      cta: "Try Kalivoa Scan",
      dataTitle: "Transparency during beta",
      data: "Kalivoa will publish screenshots tested and correction-free import data only once there is enough representative beta data. No success rate is displayed before then.",
      independent: `Kalivoa is independent and is not affiliated with ${bookmaker}.`,
    };
  }

  return {
    eyebrow: `Suivi de paris ${bookmaker}`,
    title: `Suivez vos paris ${bookmaker} sans les saisir un par un`,
    lead: `Sélectionnez une capture de votre ticket ${bookmaker}. Kalivoa Scan extrait les paris visibles, puis vous laisse vérifier chaque information avant l’import dans votre bankroll.`,
    problemTitle: "La saisie manuelle masque l’essentiel du suivi",
    problem: "Retaper un pari, sa cote et sa mise après chaque ticket prend du temps. Cette friction rend l’historique incomplet et vos statistiques moins utiles.",
    scanTitle: "Kalivoa Scan vous laisse le contrôle",
    scan: "Une capture est analysée uniquement pour préparer l’import. Rien n’est ajouté automatiquement : vous pouvez corriger un champ, supprimer un pari, l’exclure, ou vérifier les alertes de doublon et de bookmaker incohérent.",
    stepsTitle: "Comment ça fonctionne",
    steps: [
      { title: "1. Sélectionnez vos captures", description: `Choisissez une ou plusieurs captures de tickets ${bookmaker} depuis votre téléphone ou votre ordinateur.` },
      { title: "2. Vérifiez l’extraction", description: "Contrôlez les paris détectés et ne corrigez que ce qui doit l’être." },
      { title: "3. Importez dans votre bankroll", description: "Confirmez les paris pour mettre à jour votre historique et vos statistiques." },
    ],
    demoTitle: "Le premier résultat utile",
    demo: "Le parcours visé est simple : captures → vérification → import → bankroll et statistiques mises à jour. Une démonstration produit réelle sera ajoutée dès que des tickets bêta représentatifs seront disponibles.",
    formatsTitle: "Formats pris en compte pendant la bêta",
    formats: "Kalivoa se concentre sur les captures de tickets lisibles. Les simples, combinés et tickets affichant clairement un état en cours ou terminé peuvent être proposés à la vérification lorsque leurs informations sont lisibles ; chaque import reste soumis à votre validation.",
    faqTitle: "Questions fréquentes",
    faq: [
      { question: `Dois-je saisir mes paris ${bookmaker} ?`, answer: "Non. L’objectif est de partir d’une capture, puis de valider les informations proposées avant leur enregistrement." },
      { question: "L’import est-il automatique ?", answer: "Non. L’écran de vérification obligatoire permet de modifier, supprimer ou exclure tout pari proposé avant l’import." },
      { question: "Puis-je utiliser plusieurs bookmakers ?", answer: "Oui. Vous pouvez garder une bankroll distincte par bookmaker. Kalivoa alerte si un ticket ne correspond pas à la bankroll sélectionnée." },
    ],
    cta: "Essayer Kalivoa Scan",
    dataTitle: "Transparence pendant la bêta",
    data: "Kalivoa affichera le nombre de captures testées et les données d’import sans correction uniquement lorsqu’il y aura assez de données bêta représentatives. Aucun taux de réussite n’est affiché avant cela.",
    independent: `Kalivoa est indépendant et n’est pas affilié à ${bookmaker}.`,
  };
}

function statusCopy(locale: Locale, status: BookmakerSupportStatus) {
  const fr = locale === "fr";
  if (status === "TESTED") {
    return {
      label: fr ? "Format testé" : "Tested format",
      description: fr
        ? "Ce format est actuellement indiqué comme testé dans l’administration Kalivoa. Vous vérifiez toujours le résultat avant import."
        : "This format is currently marked as tested in Kalivoa administration. You always review the result before importing.",
      Icon: CheckCircle,
      className: "border-profit/30 bg-profit-muted",
    };
  }
  if (status === "VALIDATING") {
    return {
      label: fr ? "Support en validation" : "Support being validated",
      description: fr
        ? "Le support de ce bookmaker est en cours de validation pendant la bêta. Kalivoa ne revendique pas encore un import validé pour tous les tickets."
        : "Support for this bookmaker is being validated during beta. Kalivoa does not yet claim validated import for every ticket.",
      Icon: Info,
      className: "border-primary/30 bg-primary/5",
    };
  }
  return {
    label: fr ? "Format non encore validé" : "Format not yet validated",
    description: fr
      ? "Ce bookmaker ne possède pas encore de profil de lecture validé dans l’administration. La page ne constitue pas une promesse de compatibilité OCR."
      : "This bookmaker does not yet have a validated reading profile in administration. This page is not an OCR compatibility promise.",
    Icon: WarningCircle,
    className: "border-warning/30 bg-warning-muted",
  };
}

export function BookmakerSeoPage({
  locale,
  bookmaker,
  supportStatus,
}: {
  locale: Locale;
  bookmaker: string;
  supportStatus: BookmakerSupportStatus;
}) {
  const copy = copyFor(locale, bookmaker);
  const status = statusCopy(locale, supportStatus);
  const statusIcon = <status.Icon size={21} weight="fill" aria-hidden />;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <article className="marketing-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="marketing-container">
        <header className="mx-auto max-w-4xl text-center">
          <p className="marketing-eyebrow">{copy.eyebrow}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">{copy.lead}</p>
        </header>

        <section className={`mx-auto mt-10 flex max-w-4xl gap-3 rounded-2xl border p-5 text-sm leading-6 ${status.className}`}>
          <div className="mt-0.5 shrink-0">{statusIcon}</div>
          <div>
            <h2 className="font-semibold">{status.label}</h2>
            <p className="mt-1 text-muted-foreground">{status.description}</p>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">{copy.problemTitle}</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{copy.problem}</p>
          <h2 className="mt-10 text-2xl font-semibold tracking-[-0.025em]">{copy.scanTitle}</h2>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{copy.scan}</p>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-[-0.025em]">{copy.stepsTitle}</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {copy.steps.map((step) => (
              <article key={step.title} className="marketing-card p-6">
                <CheckCircle size={21} className="text-profit" weight="fill" aria-hidden />
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-solution mt-8 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{copy.demoTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.demo}</p>
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">{copy.formatsTitle}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">{copy.formats}</p>
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">{copy.faqTitle}</h2>
          <div className="mt-7 space-y-4">
            {copy.faq.map((item) => (
              <details key={item.question} className="marketing-card p-5">
                <summary className="cursor-pointer font-semibold">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{copy.dataTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.data}</p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{copy.independent}</p>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/signup" locale={locale} className="marketing-primary-cta">
            {copy.cta}
            <ArrowRight size={18} weight="bold" aria-hidden />
          </Link>
          <Link href="/bookmakers" locale={locale} className="marketing-secondary-cta">
            {locale === "fr" ? "Voir les autres bookmakers" : "View other bookmakers"}
          </Link>
        </div>
      </div>
    </article>
  );
}
