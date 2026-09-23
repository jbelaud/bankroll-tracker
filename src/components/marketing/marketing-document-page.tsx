import { ArrowRight, House, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

type Kind = "legal" | "sales";
type DocumentSection = { id: string; title: string; paragraphs: string[] };

const documents: Record<Kind, Record<"fr" | "en", {
  eyebrow: string; title: string; intro: string; status: string; updated: string;
  sections: DocumentSection[]; references: { label: string; href: string }[];
  primary: string; secondary: string; home: string;
}>> = {
  legal: {
    fr: {
      eyebrow: "Informations légales",
      title: "Mentions légales de Kalivoa",
      intro: "Cette page identifie les informations publiées à propos du site kalivoa.com et signale clairement celles qui restent à compléter.",
      status: "À finaliser avant commercialisation : identité de l’éditeur, adresse, immatriculation, directeur de la publication et e-mail public.",
      updated: "Mise à jour : 23 septembre 2026",
      sections: [
        { id: "publisher", title: "1. Éditeur du site", paragraphs: ["Service édité : Kalivoa — https://kalivoa.com.", "L’identité ou la dénomination sociale de l’éditeur, son adresse, ses numéros d’immatriculation le cas échéant, son numéro de téléphone, son adresse électronique publique et le nom du directeur de la publication ne sont pas présents dans le dépôt. Ces informations obligatoires doivent être renseignées par le responsable légal avant l’ouverture commerciale."] },
        { id: "hosting", title: "2. Hébergement", paragraphs: ["Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Site : vercel.com."] },
        { id: "purpose", title: "3. Objet du service", paragraphs: ["Kalivoa est un outil indépendant d’import, d’organisation et d’analyse d’un historique de paris sportifs. Il ne prend aucun pari, ne fournit aucun conseil de pari et ne garantit aucun résultat."] },
        { id: "rights", title: "4. Propriété intellectuelle", paragraphs: ["Sauf mention contraire, la structure, les textes, les éléments graphiques, la marque et les fonctionnalités de Kalivoa sont protégés. Toute reproduction ou exploitation non autorisée peut porter atteinte aux droits de leur titulaire."] },
        { id: "liability", title: "5. Responsabilité et liens externes", paragraphs: ["Les informations et indicateurs sont fournis à titre de suivi. L’utilisateur reste responsable de la vérification des données importées et de ses décisions.", "Les liens vers des services tiers sont proposés pour information. Kalivoa n’est pas affilié aux bookmakers et ne contrôle pas leurs contenus ni leur disponibilité."] },
        { id: "data", title: "6. Données personnelles", paragraphs: ["Le traitement des données, les finalités et les droits des utilisateurs sont décrits dans la politique de confidentialité. Les demandes peuvent être envoyées depuis Mon compte > Aide et support tant qu’une adresse publique n’est pas publiée."] },
      ],
      references: [{ label: "Service Public — mentions légales obligatoires", href: "https://entreprendre.service-public.gouv.fr/P10025" }],
      primary: "Lire la confidentialité", secondary: "Contacter Kalivoa", home: "Accueil",
    },
    en: {
      eyebrow: "Legal information", title: "Kalivoa legal notice",
      intro: "This page identifies the information published about kalivoa.com and clearly flags what still needs to be completed.",
      status: "To complete before commercial availability: publisher identity, address, registration, publication director and public email.",
      updated: "Updated: September 23, 2026",
      sections: [
        { id: "publisher", title: "1. Website publisher", paragraphs: ["Published service: Kalivoa — https://kalivoa.com.", "The publisher's identity or legal name, address, registration numbers where applicable, telephone number, public email and publication director are not present in the repository. The legal owner must provide this mandatory information before commercial availability."] },
        { id: "hosting", title: "2. Hosting", paragraphs: ["The website is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States. Website: vercel.com."] },
        { id: "purpose", title: "3. Service purpose", paragraphs: ["Kalivoa is an independent tool for importing, organizing and analyzing sports-betting history. It does not place bets, provide betting advice or guarantee results."] },
        { id: "rights", title: "4. Intellectual property", paragraphs: ["Unless stated otherwise, Kalivoa's structure, copy, visual elements, brand and features are protected. Unauthorized reproduction or use may infringe their owner's rights."] },
        { id: "liability", title: "5. Liability and external links", paragraphs: ["Information and indicators are provided for tracking purposes. Users remain responsible for checking imported data and for their decisions.", "Links to third-party services are provided for information. Kalivoa is not affiliated with bookmakers and does not control their content or availability."] },
        { id: "data", title: "6. Personal data", paragraphs: ["Data processing, purposes and user rights are described in the privacy policy. Requests can be sent from My account > Help and support until a public address is published."] },
      ],
      references: [{ label: "French public service — mandatory legal notice", href: "https://entreprendre.service-public.gouv.fr/P10025" }],
      primary: "Read privacy policy", secondary: "Contact Kalivoa", home: "Home",
    },
  },
  sales: {
    fr: {
      eyebrow: "Cadre commercial",
      title: "Conditions générales de vente",
      intro: "Ce projet de CGV prépare l’ouverture de futures offres payantes Kalivoa. Aucune offre payante n’est actuellement proposée en ligne.",
      status: "Projet précontractuel : ces conditions ne deviennent applicables qu’à l’ouverture d’une offre payante, après ajout des informations légales et commerciales manquantes.",
      updated: "Version préparatoire du 23 septembre 2026",
      sections: [
        { id: "scope", title: "1. Objet et champ d’application", paragraphs: ["Ces conditions ont vocation à encadrer la souscription en ligne par un consommateur à une offre payante donnant accès à des fonctionnalités Kalivoa. Le service reste destiné aux personnes majeures.", "L’identité complète du vendeur devra être reprise des mentions légales avant toute mise en vente."] },
        { id: "service", title: "2. Service proposé", paragraphs: ["Kalivoa permet d’organiser des bankrolls, d’enregistrer ou d’importer des paris et de consulter des indicateurs calculés à partir de l’historique. Les extractions automatisées doivent être vérifiées par l’utilisateur.", "Kalivoa n’est ni un bookmaker ni un conseiller en paris et ne promet aucun gain."] },
        { id: "order", title: "3. Offre, prix et commande", paragraphs: ["Chaque offre devra afficher avant paiement ses fonctionnalités, limites, prix TTC, périodicité, durée et éventuel renouvellement. Créer un compte gratuit ne vaut pas commande.", "Avant validation, le client devra pouvoir vérifier et corriger sa commande, accepter les présentes CGV et confirmer expressément son obligation de paiement."] },
        { id: "payment", title: "4. Paiement et facturation", paragraphs: ["Le paiement en ligne a vocation à être traité par Stripe. Les moyens acceptés, la date de prélèvement et les conditions de facturation seront indiqués au moment de la commande. Kalivoa ne reçoit pas le numéro complet de carte bancaire."] },
        { id: "term", title: "5. Durée, renouvellement et résiliation", paragraphs: ["La durée de l’offre, sa date d’effet, son éventuel renouvellement automatique et ses modalités de résiliation devront être présentés avant la souscription.", "Toute offre renouvelable souscrite en ligne devra pouvoir être résiliée en ligne. La date de fin d’accès et les effets de la résiliation seront confirmés sur un support durable."] },
        { id: "withdrawal", title: "6. Droit de rétractation", paragraphs: ["Pour une prestation de service conclue à distance, le consommateur dispose en principe de quatorze jours à compter de la conclusion du contrat pour se rétracter.", "Si le client demande expressément que le service commence avant la fin de ce délai, le parcours de commande devra recueillir cette demande et fournir les informations et le formulaire requis. Aucune renonciation anticipée ne sera présumée."] },
        { id: "availability", title: "7. Disponibilité et support", paragraphs: ["Kalivoa vise une disponibilité continue sans garantir l’absence d’interruption, notamment lors de maintenances ou d’incidents de prestataires. Les demandes de support passent actuellement par Mon compte > Aide et support."] },
        { id: "liability", title: "8. Responsabilité", paragraphs: ["L’utilisateur demeure responsable de l’exactitude des données validées, de la confidentialité de son compte et de ses décisions de jeu. Les limitations éventuellement prévues ne peuvent exclure les garanties ou responsabilités impératives dues au consommateur."] },
        { id: "disputes", title: "9. Réclamations, médiation et droit applicable", paragraphs: ["Une réclamation devra d’abord être adressée à l’éditeur. Les coordonnées publiques et le médiateur de la consommation compétent devront être désignés avant toute vente.", "Le droit français a vocation à s’appliquer, sans priver le consommateur des protections impératives dont il bénéficie. À défaut d’accord amiable ou de médiation, le litige relève des juridictions compétentes."] },
      ],
      references: [
        { label: "DGCCRF — règles du commerce en ligne", href: "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/e-commerce-les-regles-entre-professionnels-et-consommateurs" },
        { label: "Service Public — conclusion d’un achat à distance", href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10488" },
      ],
      primary: "Voir les tarifs", secondary: "Poser une question", home: "Accueil",
    },
    en: {
      eyebrow: "Commercial framework", title: "Terms and conditions of sale",
      intro: "This draft prepares future paid Kalivoa plans. No paid plan is currently offered online.",
      status: "Pre-contract draft: these terms only become applicable when a paid plan opens and the missing legal and commercial information has been added.",
      updated: "Draft version dated September 23, 2026",
      sections: [
        { id: "scope", title: "1. Purpose and scope", paragraphs: ["These terms are intended to govern online subscriptions by consumers to paid plans granting access to Kalivoa features. The service remains intended for adults.", "The seller's complete identity must be taken from the legal notice before any sale opens."] },
        { id: "service", title: "2. Service", paragraphs: ["Kalivoa organizes bankrolls, records or imports bets and displays indicators calculated from history. Users must review automated extractions.", "Kalivoa is neither a bookmaker nor a betting adviser and promises no gain."] },
        { id: "order", title: "3. Plan, price and order", paragraphs: ["Before payment, every plan must show its features, limits, tax-inclusive price, billing frequency, duration and any renewal. Creating a free account is not an order.", "Before confirming, customers must be able to review and correct the order, accept these terms and expressly confirm their payment obligation."] },
        { id: "payment", title: "4. Payment and invoicing", paragraphs: ["Online payments are intended to be processed by Stripe. Accepted methods, charge dates and invoicing terms will be shown during checkout. Kalivoa does not receive full card numbers."] },
        { id: "term", title: "5. Term, renewal and cancellation", paragraphs: ["The plan term, effective date, any automatic renewal and cancellation terms must be shown before subscription.", "Any renewable plan bought online must be cancellable online. The end date and effects of cancellation will be confirmed on a durable medium."] },
        { id: "withdrawal", title: "6. Right of withdrawal", paragraphs: ["For a distance service contract, consumers generally have fourteen days from contract conclusion to withdraw.", "If a customer expressly asks for service to start before that period ends, checkout must collect that request and provide the required information and form. No early waiver will be presumed."] },
        { id: "availability", title: "7. Availability and support", paragraphs: ["Kalivoa aims for continuous availability without guaranteeing uninterrupted access, including during maintenance or provider incidents. Support currently runs through My account > Help and support."] },
        { id: "liability", title: "8. Liability", paragraphs: ["Users remain responsible for validated data, account security and gambling decisions. Any limitation cannot exclude mandatory consumer guarantees or liabilities."] },
        { id: "disputes", title: "9. Complaints, mediation and governing law", paragraphs: ["Complaints must first be sent to the publisher. A public contact and competent consumer mediator must be designated before any sale.", "French law is intended to apply without depriving consumers of mandatory protections. If no amicable or mediated resolution is found, disputes fall under the competent courts."] },
      ],
      references: [
        { label: "DGCCRF — online commerce rules", href: "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/e-commerce-les-regles-entre-professionnels-et-consommateurs" },
        { label: "French public service — distance contract conclusion", href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10488" },
      ],
      primary: "View pricing", secondary: "Ask a question", home: "Home",
    },
  },
};

export function MarketingDocumentPage({ locale, kind }: { locale: Locale; kind: Kind }) {
  const page = documents[kind][locale === "en" ? "en" : "fr"];
  const primaryHref = kind === "legal" ? "/privacy" : "/pricing";

  return (
    <article className="py-12 sm:py-20 lg:py-24">
      <div className="kalivoa-content-frame max-w-5xl">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground"><House size={14} aria-hidden />{page.home}</Link>
          <span aria-hidden>/</span><span aria-current="page" className="truncate">{page.eyebrow}</span>
        </nav>

        <header className="mt-7 max-w-3xl sm:mt-10">
          <p className="marketing-eyebrow"><Info size={16} weight="fill" aria-hidden />{page.eyebrow}</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">{page.intro}</p>
          <p className="mt-5 text-xs font-medium text-muted-foreground">{page.updated}</p>
        </header>

        <div role="note" className="mt-8 flex gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 text-sm leading-6 sm:p-5">
          <WarningCircle size={22} className="mt-0.5 shrink-0 text-warning" weight="fill" aria-hidden />
          <p>{page.status}</p>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={locale === "fr" ? "Sommaire" : "Contents"} className="hidden rounded-2xl border border-border bg-card/45 p-3 lg:sticky lg:top-24 lg:block">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{locale === "fr" ? "Sommaire" : "Contents"}</p>
            {page.sections.map((section) => <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-3 py-2 text-xs leading-5 text-muted-foreground hover:bg-muted hover:text-foreground">{section.title}</a>)}
          </nav>

          <div className="min-w-0 space-y-4">
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-border bg-card/45 p-5 sm:p-7">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-muted-foreground">{paragraph}</p>)}
                </div>
              </section>
            ))}
            <aside className="rounded-2xl border border-border bg-muted/25 p-5 sm:p-6">
              <h2 className="text-sm font-semibold">{locale === "fr" ? "Sources officielles consultées" : "Official sources consulted"}</h2>
              <ul className="mt-3 space-y-2">
                {page.references.map((reference) => <li key={reference.href}><a href={reference.href} target="_blank" rel="noopener noreferrer" className="marketing-text-link text-sm">{reference.label}<ArrowRight size={15} aria-hidden /></a></li>)}
              </ul>
            </aside>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} locale={locale} className="marketing-primary-cta">{page.primary}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
          <Link href="/contact" locale={locale} className="marketing-secondary-cta">{page.secondary}</Link>
        </div>
      </div>
    </article>
  );
}
