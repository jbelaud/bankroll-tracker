import {
  ArrowRight,
  Bug,
  ChatCircleDots,
  DiscordLogo,
  House,
  Lightbulb,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

const copy = {
  fr: {
    eyebrow: "Contact et support",
    title: "Comment peut-on vous aider ?",
    description: "Un seul point d’entrée pour signaler un bug, proposer une idée ou poser une question sur vos données.",
    primary: "Ouvrir l’aide dans Mon compte",
    secondary: "Consulter la FAQ",
    sectionTitle: "Choisissez le bon motif",
    sectionDescription: "Votre demande arrive avec le contexte utile pour éviter les allers-retours.",
    cards: [
      { title: "Un problème technique", description: "Indiquez la page concernée, ce que vous faisiez et le résultat obtenu." },
      { title: "Une idée d’amélioration", description: "Expliquez votre besoin : le problème à résoudre compte plus que la solution imaginée." },
      { title: "Vos données ou votre compte", description: "Demandez un export, une suppression ou de l’aide sur vos informations personnelles." },
    ],
    processTitle: "Envoyer une demande en moins d’une minute",
    steps: ["Connectez-vous à Kalivoa.", "Ouvrez Mon compte, puis Aide et support.", "Choisissez un motif et décrivez votre demande."],
    discordTitle: "Vous préférez échanger avec la communauté ?",
    discordDescription: "Le serveur Discord Kalivoa est ouvert aux retours sur la bêta. N’y publiez aucune donnée personnelle ni capture contenant des informations sensibles.",
    discordCta: "Rejoindre le Discord",
    note: "Kalivoa ne dispose pas encore d’une adresse e-mail publique de support. Elle devra être publiée avec l’identité légale de l’éditeur avant toute commercialisation.",
    home: "Accueil",
  },
  en: {
    eyebrow: "Contact and support",
    title: "How can we help?",
    description: "One clear entry point to report a bug, suggest an idea or ask a question about your data.",
    primary: "Open help in My account",
    secondary: "Read the FAQ",
    sectionTitle: "Choose the right topic",
    sectionDescription: "Your request includes useful context, reducing unnecessary back and forth.",
    cards: [
      { title: "A technical issue", description: "Mention the affected page, what you were doing and what happened." },
      { title: "A product idea", description: "Describe your need: the problem to solve matters more than a proposed solution." },
      { title: "Your data or account", description: "Request an export, deletion or help with your personal information." },
    ],
    processTitle: "Send a request in under a minute",
    steps: ["Sign in to Kalivoa.", "Open My account, then Help and support.", "Choose a topic and describe your request."],
    discordTitle: "Would you rather talk with the community?",
    discordDescription: "The Kalivoa Discord welcomes beta feedback. Do not post personal data or screenshots containing sensitive information.",
    discordCta: "Join Discord",
    note: "Kalivoa does not yet have a public support email address. It must be published with the publisher's legal identity before commercial availability.",
    home: "Home",
  },
} as const;

const cardIcons = [Bug, Lightbulb, ShieldCheck] as const;

export function MarketingContactPage({ locale }: { locale: Locale }) {
  const page = copy[locale === "en" ? "en" : "fr"];

  return (
    <article className="py-12 sm:py-20 lg:py-24">
      <div className="kalivoa-content-frame max-w-5xl">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" locale={locale} className="inline-flex items-center gap-1 hover:text-foreground"><House size={14} aria-hidden />{page.home}</Link>
          <span aria-hidden>/</span><span aria-current="page">Contact</span>
        </nav>

        <header className="mt-7 max-w-3xl sm:mt-10">
          <p className="marketing-eyebrow"><ChatCircleDots size={16} weight="fill" aria-hidden />{page.eyebrow}</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{page.title}</h1>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">{page.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/account/help" locale={locale} className="marketing-primary-cta">{page.primary}<ArrowRight size={18} weight="bold" aria-hidden /></Link>
            <Link href="/faq" locale={locale} className="marketing-secondary-cta">{page.secondary}</Link>
          </div>
        </header>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">{page.sectionTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{page.sectionDescription}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {page.cards.map((card, index) => {
              const Icon = cardIcons[index];
              return <article key={card.title} className="marketing-card flex gap-4 p-5 md:block md:p-6"><Icon size={22} className="shrink-0 text-primary" weight="duotone" aria-hidden /><div><h3 className="font-semibold md:mt-5">{card.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p></div></article>;
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="marketing-solution p-5 sm:p-7">
            <h2 className="text-xl font-semibold">{page.processTitle}</h2>
            <ol className="mt-5 grid gap-4">
              {page.steps.map((step, index) => <li key={step} className="flex items-center gap-3 text-sm leading-6"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{index + 1}</span>{step}</li>)}
            </ol>
          </div>
          <div className="marketing-card p-5 sm:p-7">
            <DiscordLogo size={25} className="text-primary" weight="fill" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">{page.discordTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{page.discordDescription}</p>
            <a href="https://discord.gg/aMc8jDAAx" target="_blank" rel="noopener noreferrer" className="marketing-text-link mt-5">{page.discordCta}<ArrowRight size={16} aria-hidden /></a>
          </div>
        </section>

        <p className="mt-6 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs leading-5 text-muted-foreground">{page.note}</p>
      </div>
    </article>
  );
}
