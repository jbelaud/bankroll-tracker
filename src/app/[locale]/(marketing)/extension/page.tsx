import type { Metadata } from "next";
import { ArrowSquareOut, Browser, Images, Scan, ShieldCheck, DeviceMobile, PuzzlePiece } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { publicAlternates } from "@/lib/marketing-seo";
import { CHROME_EXTENSION_STORE_URL } from "@/lib/chrome-extension";

const copy = {
  fr: {
    title: "Tes paris, directement du bookmaker à Kalivoa.",
    description: "Capture tes tickets depuis Chrome, enchaîne les captures et envoie-les ensemble vers Kalivoa. Vérifie les informations détectées dans le Scan avant d’importer tes paris.",
    badge: "Extension officielle · Disponible sur le Chrome Web Store",
    install: "Installer l’extension Chrome",
    store: "Voir sur le Chrome Web Store",
    newTab: "(nouvel onglet)",
    howLink: "Comment ça marche ?",
    desktopHint: "Installe l’extension depuis Chrome sur ordinateur, puis épingle Kalivoa dans le menu Extensions.",
    mobileHint: "L’extension s’utilise dans Chrome sur ordinateur. Sur mobile, envoie tes captures d’écran au Scan Kalivoa.",
    how: "De ton bookmaker à l’import, en 4 étapes",
    flow: [
      ["Ouvre ton bookmaker", "Connecte-toi normalement à ton bookmaker dans Chrome et affiche le détail de ton ticket."],
      ["Capture ton ticket", "Ouvre l’extension Kalivoa et sélectionne la zone du ticket. Tu peux aussi utiliser Alt + Maj + K."],
      ["Enchaîne les captures", "Passe au ticket suivant : tes images restent dans la file locale de l’extension, sans attendre une analyse entre chaque capture."],
      ["Envoie, vérifie et importe", "Clique sur « Envoyer à Kalivoa » pour transmettre ton lot au Scan. Vérifie les données détectées et les doublons, puis confirme l’import."],
    ],
    batchTitle: "Plusieurs paris à importer ? Capture-les à la suite.",
    batchText: "Parcours tes tickets à ton rythme et garde tes captures dans l’extension. Quand ton lot est prêt, envoie-le vers Kalivoa en une seule action : pas de screenshots à enregistrer sur ton ordinateur ni d’import image par image.",
    batchFeatures: ["Jusqu’à 100 captures par lot, dans la limite de 40 Mo.", "Prévisualise les captures et supprime celles que tu ne veux pas envoyer.", "La file est conservée même si tu fermes la fenêtre de l’extension."],
    batchHint: "L’analyse démarre après l’envoi. Seules les images analysées consomment des Scans ; tu vérifies les paris avant l’import.",
    devices: "Ordinateur ou mobile, retrouve le même Scan",
    computer: "Sur ordinateur",
    computerText: "Capture les tickets visibles dans Chrome avec l’extension, puis envoie ton lot au Scan Kalivoa.",
    mobile: "Sur mobile",
    mobileText: "Fais une capture d’écran depuis ton bookmaker, puis ajoute-la au Scan Kalivoa comme d’habitude.",
    compatibility: "Ton ticket est visible dans Chrome ? Tu peux le capturer.",
    compatibilityText: "Tu sélectionnes toi-même la zone à capturer, quel que soit le bookmaker. Kalivoa analyse ensuite l’image : l’extension ne parcourt pas automatiquement ton historique.",
    privacy: "Tes captures restent locales jusqu’à ton envoi",
    privacyText: "L’extension ne demande pas tes identifiants bookmaker et ne surveille pas tes pages en continu. Capture uniquement le ticket et évite les informations personnelles.",
    policy: "Confidentialité de l’extension",
    scan: "Ouvrir le Scan",
  },
  en: {
    title: "Your bets, straight from your bookmaker to Kalivoa.",
    description: "Capture tickets in Chrome, collect several screenshots and send them together to Kalivoa. Review the detected details in Scan before importing your bets.",
    badge: "Official extension · Available on the Chrome Web Store",
    install: "Install the Chrome extension",
    store: "View on the Chrome Web Store",
    newTab: "(new tab)",
    howLink: "How does it work?",
    desktopHint: "Install the extension in Chrome on your computer, then pin Kalivoa in the Extensions menu.",
    mobileHint: "The extension runs in Chrome on a computer. On mobile, send your screenshots to Kalivoa Scan.",
    how: "From your bookmaker to import in 4 steps",
    flow: [
      ["Open your bookmaker", "Sign in to your bookmaker as usual in Chrome and open the ticket details."],
      ["Capture your ticket", "Open the Kalivoa extension and select the ticket area. You can also use Alt + Shift + K."],
      ["Keep capturing", "Move to the next ticket: your images stay in the extension’s local queue without waiting for analysis between captures."],
      ["Send, review and import", "Click Send to Kalivoa to transfer your batch to Scan. Review the detected details and duplicates, then confirm the import."],
    ],
    batchTitle: "Several bets to import? Capture them one after another.",
    batchText: "Browse your tickets at your own pace and keep your captures in the extension. When your batch is ready, send it to Kalivoa in one action: no screenshots to save to your computer or upload one at a time.",
    batchFeatures: ["Up to 100 captures per batch, within the 40 MB limit.", "Preview captures and remove any you do not want to send.", "Your queue is kept even when you close the extension popup."],
    batchHint: "Analysis starts after you send the batch. Only analyzed images consume Scans; you review the bets before importing.",
    devices: "Computer or mobile, use the same Scan",
    computer: "On a computer",
    computerText: "Capture tickets visible in Chrome with the extension, then send your batch to Kalivoa Scan.",
    mobile: "On mobile",
    mobileText: "Take a screenshot from your bookmaker, then add it to Kalivoa Scan as usual.",
    compatibility: "Can you see your ticket in Chrome? You can capture it.",
    compatibilityText: "You select the area to capture yourself, regardless of the bookmaker. Kalivoa then analyzes the image: the extension does not browse your history automatically.",
    privacy: "Captures stay local until you send them",
    privacyText: "The extension does not ask for bookmaker credentials or continuously monitor your pages. Capture only the ticket and avoid personal information.",
    policy: "Extension privacy",
    scan: "Open Scan",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fr" ? "Extension Chrome Kalivoa — Capture en série" : "Kalivoa Chrome extension — Batch captures",
    description: copy[locale].description,
    alternates: publicAlternates(locale, "/extension"),
  };
}

export default async function ExtensionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = copy[locale];
  const primaryLink = "min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const secondaryLink = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return <div className="kalivoa-content-frame space-y-12 py-12 sm:py-20">
    <section className="max-w-3xl space-y-6">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary"><PuzzlePiece size={18} className="shrink-0" aria-hidden />{t.badge}</span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="text-lg leading-8 text-muted-foreground">{t.description}</p>
      <div className="flex flex-wrap gap-3">
        <a href={CHROME_EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className={`${primaryLink} hidden lg:inline-flex`}>
          <PuzzlePiece size={20} aria-hidden />{t.install}<ArrowSquareOut size={18} aria-hidden /><span className="sr-only">{t.newTab}</span>
        </a>
        <Link href="/scan" className={`${primaryLink} inline-flex lg:hidden`}><Scan size={20} aria-hidden />{t.scan}</Link>
        <a href="#how-it-works" className={secondaryLink}>{t.howLink}</a>
      </div>
      <p className="hidden text-sm text-muted-foreground lg:block">{t.desktopHint}</p>
      <div className="space-y-3 lg:hidden">
        <p className="text-sm leading-6 text-muted-foreground">{t.mobileHint}</p>
        <a href={CHROME_EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t.store}<ArrowSquareOut size={16} aria-hidden /><span className="sr-only">{t.newTab}</span></a>
      </div>
    </section>

    <section id="how-it-works" className="scroll-mt-24">
      <h2 className="mb-5 text-2xl font-semibold">{t.how}</h2>
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{t.flow.map(([title, description], i) => <li key={title} className="glass-card rounded-2xl p-6">
        <span className="font-mono text-sm text-primary" aria-hidden>0{i + 1}</span>
        <h3 className="my-3 text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </li>)}</ol>
    </section>

    <section className="space-y-5 rounded-2xl border border-primary/25 bg-primary/10 p-6 sm:p-8">
      <Images size={32} className="text-primary" aria-hidden />
      <h2 className="text-2xl font-semibold">{t.batchTitle}</h2>
      <p className="max-w-3xl leading-7 text-muted-foreground">{t.batchText}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6">{t.batchFeatures.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <p className="max-w-3xl border-t border-primary/20 pt-4 text-sm leading-6 text-muted-foreground">{t.batchHint}</p>
    </section>

    <section>
      <h2 className="mb-5 text-2xl font-semibold">{t.devices}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="glass-card space-y-3 rounded-2xl p-6">
          <Browser size={28} className="text-primary" aria-hidden /><h3 className="text-lg font-semibold">{t.computer}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{t.computerText}</p>
          <a href={CHROME_EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t.store}<ArrowSquareOut size={16} aria-hidden /><span className="sr-only">{t.newTab}</span></a>
        </article>
        <article className="glass-card space-y-3 rounded-2xl p-6">
          <DeviceMobile size={28} className="text-primary" aria-hidden /><h3 className="text-lg font-semibold">{t.mobile}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{t.mobileText}</p>
          <Link href="/scan" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Scan size={18} aria-hidden />{t.scan}</Link>
        </article>
      </div>
    </section>

    <section className="max-w-3xl space-y-3"><h2 className="text-xl font-semibold">{t.compatibility}</h2><p className="text-sm leading-6 text-muted-foreground">{t.compatibilityText}</p></section>
    <section className="max-w-3xl space-y-3"><ShieldCheck size={28} className="text-primary" aria-hidden /><h2 className="text-xl font-semibold">{t.privacy}</h2><p className="text-sm leading-6 text-muted-foreground">{t.privacyText}</p><Link href="/extension/privacy" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t.policy}</Link></section>
  </div>;
}
