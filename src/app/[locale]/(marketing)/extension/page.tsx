import type { Metadata } from "next";
import { DownloadSimple, Scan, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { publicAlternates } from "@/lib/marketing-seo";

const copy = {
  fr: {
    title: "Tes tickets, directement dans Kalivoa.", description: "Capture tes tickets depuis Chrome, envoie-les ensemble et retrouve le Scan habituel pour vérifier tes paris avant de les importer.",
    badge: "Extension Chrome · Bêta 0.1.0", download: "Télécharger l’extension", store: "Ajouter à Chrome", install: "Installer la bêta", desktop: "Sur ordinateur avec Google Chrome. Le Scan reste disponible sur mobile.",
    steps: ["Télécharge le fichier ZIP et extrais-le dans un dossier que tu conserveras sur ton ordinateur.", "Ouvre chrome://extensions dans Chrome et active le mode développeur en haut à droite.", "Clique sur « Charger l’extension non empaquetée », puis sélectionne le dossier extrait contenant manifest.json.", "Épingle Kalivoa depuis le menu Extensions de Chrome, puis connecte-toi à Kalivoa."],
    how: "De la capture à l’import", flow: [["Capture", "Sélectionne uniquement la zone du ticket. Recommence pour chaque pari, ou utilise Alt + Maj + K."], ["Envoie", "Clique sur « Envoyer à Kalivoa » une fois tes captures prêtes. Seules les images analysées consomment des Scans."], ["Vérifie", "Suis l’analyse dans Scan, corrige les données et vérifie les doublons avant de confirmer l’import."]],
    privacy: "Tes captures restent locales jusqu’à ton envoi", privacyText: "L’extension ne demande pas tes identifiants bookmaker et ne surveille pas tes pages en continu. Capture uniquement le ticket et évite les informations personnelles.", policy: "Confidentialité de l’extension", beta: "Cette bêta s’installe manuellement. L’installation depuis le Chrome Web Store sera proposée ici dès sa publication.", scan: "Ouvrir Scan", update: "Pour mettre à jour la bêta, extrais la nouvelle version dans le même dossier, puis clique sur Actualiser dans chrome://extensions.",
  },
  en: {
    title: "Your tickets, straight into Kalivoa.", description: "Capture tickets in Chrome, send them together and use the familiar Scan flow to review your bets before importing.",
    badge: "Chrome extension · Beta 0.1.0", download: "Download the extension", store: "Add to Chrome", install: "Install the beta", desktop: "On a computer with Google Chrome. Scan remains available on mobile.",
    steps: ["Download the ZIP and extract it into a folder you will keep on your computer.", "Open chrome://extensions in Chrome and enable Developer mode in the top right corner.", "Click Load unpacked and select the extracted folder containing manifest.json.", "Pin Kalivoa from Chrome’s Extensions menu, then sign in to Kalivoa."],
    how: "From capture to import", flow: [["Capture", "Select only the ticket area. Repeat for each bet, or use Alt + Shift + K."], ["Send", "Click Send to Kalivoa when your captures are ready. Only analyzed images consume Scans."], ["Review", "Follow the analysis in Scan, correct the extracted data and check duplicates before confirming the import."]],
    privacy: "Captures stay local until you send them", privacyText: "The extension does not ask for bookmaker credentials or continuously monitor your pages. Capture only the ticket and avoid personal information.", policy: "Extension privacy", beta: "This beta requires manual installation. Chrome Web Store installation will appear here once published.", scan: "Open Scan", update: "To update the beta, extract the new version into the same folder, then click Reload in chrome://extensions.",
  },
};
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fr" ? "Extension Chrome Kalivoa" : "Kalivoa Chrome extension", description: copy[locale].description, alternates: publicAlternates(locale, "/extension") };
}
export default async function ExtensionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params; const t = copy[locale];
  const candidate = process.env.CHROME_EXTENSION_STORE_URL;
  const storeUrl = candidate && /^https:\/\/chromewebstore\.google\.com\/detail\/[^/]+\/[a-p]{32}$/.test(candidate) ? candidate : null;
  return <div className="kalivoa-content-frame space-y-12 py-12 sm:py-20">
    <section className="max-w-3xl space-y-6">
      <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">{t.badge}</span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="text-lg leading-8 text-muted-foreground">{t.description}</p>
      <div className="flex flex-wrap gap-3">
        <a href={storeUrl ?? "/downloads/kalivoa-extension-0.1.0.zip"} download={storeUrl ? undefined : true} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"><DownloadSimple size={20} aria-hidden />{storeUrl ? t.store : t.download}</a>
        <Link href="/scan" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 font-semibold hover:bg-muted"><Scan size={20} aria-hidden />{t.scan}</Link>
      </div>
      <p className="text-sm text-muted-foreground">{t.desktop}</p>
    </section>
    <section><h2 className="mb-5 text-2xl font-semibold">{t.how}</h2><div className="grid gap-4 md:grid-cols-3">{t.flow.map(([title, description], i) => <article key={title} className="glass-card rounded-2xl p-6"><span className="font-mono text-sm text-primary">0{i + 1}</span><h3 className="my-3 text-lg font-semibold">{title}</h3><p className="text-sm leading-6 text-muted-foreground">{description}</p></article>)}</div></section>
    {!storeUrl && <section className="glass-card max-w-3xl space-y-5 rounded-2xl p-6 sm:p-8"><h2 className="text-2xl font-semibold">{t.install}</h2><p className="text-sm leading-6 text-muted-foreground">{t.beta}</p><ol className="list-decimal space-y-4 pl-5 text-sm leading-6">{t.steps.map(step => <li key={step} className="pl-2">{step}</li>)}</ol><p className="border-t border-border pt-5 text-sm leading-6 text-muted-foreground">{t.update}</p></section>}
    <section className="max-w-3xl space-y-3"><ShieldCheck size={28} className="text-primary" aria-hidden /><h2 className="text-xl font-semibold">{t.privacy}</h2><p className="text-sm leading-6 text-muted-foreground">{t.privacyText}</p><Link href="/extension/privacy" className="text-sm text-primary underline underline-offset-4">{t.policy}</Link></section>
  </div>;
}
