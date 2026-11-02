import frMessages from "../../../messages/fr.json";
import enMessages from "../../../messages/en.json";
import { COMPANY } from "@/lib/company";
import { aboutCopy } from "@/lib/marketing/about-copy";
import { getSiteUrlForPath } from "@/lib/site";

export type AgentLocale = "fr" | "en";

/** Marketing pages that have a Markdown representation: logical path -> meta key. */
const MARKDOWN_META_KEYS: Record<string, string> = {
  "/features": "features",
  "/screenshot-import": "import",
  "/bankroll-tracking": "bankroll",
  "/pricing": "pricing",
  "/bookmakers": "bookmakers",
  "/faq": "faq",
  "/contact": "contact",
  "/legal-notice": "legal",
  "/sales-terms": "sales",
};

/**
 * Real HTML routes without a Markdown representation. Requests for them keep
 * the normal HTML flow; anything else that asks for Markdown is a Markdown 404.
 */
export const HTML_ONLY_ROUTE_PREFIXES = [
  "/dashboard", "/bankrolls", "/scan", "/stats", "/account", "/history", "/referrals", "/partners",
  "/login", "/signup", "/forgot-password", "/reset-password", "/admin", "/following", "/tipsters",
  "/tipsters-preview", "/tipster-space", "/ai-insights", "/import-history", "/discover", "/p", "/t",
  "/privacy", "/terms", "/responsible-gambling", "/certification", "/extension", "/academie",
  "/bookmakers/", "/partenaires", "/offre-bienvenue", "/retractation",
];

export const MARKDOWN_PATHS = ["", "/about", ...Object.keys(MARKDOWN_META_KEYS)];

export type MarkdownRoute = "page" | "html-only" | "not-found";

type Preference = { q: number; index: number };

/** Markdown must be strictly preferred over HTML, or tied and listed first. */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const found: { markdown?: Preference; html?: Preference } = {};
  accept.split(",").forEach((part, index) => {
    const [type, ...params] = part.trim().toLowerCase().split(";");
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const parsed = qParam ? Number(qParam.slice(2)) : 1;
    const q = Number.isFinite(parsed) ? parsed : 1;
    if (type === "text/markdown") found.markdown = { q, index };
    else if (type === "text/html") found.html = { q, index };
  });
  const { markdown, html } = found;
  if (!markdown || markdown.q <= 0) return false;
  if (!html) return true;
  return markdown.q > html.q || (markdown.q === html.q && markdown.index < html.index);
}

export function splitLocalePath(pathname: string): { locale: AgentLocale; path: string } | null {
  const match = pathname.match(/^\/(fr|en)(?=\/|$)/);
  if (!match) return null;
  const rest = pathname.slice(match[0].length).replace(/\/+$/, "");
  return { locale: match[1] as AgentLocale, path: rest };
}

export function classifyMarkdownRoute(path: string): MarkdownRoute {
  if (MARKDOWN_PATHS.includes(path)) return "page";
  const htmlOnly = HTML_ONLY_ROUTE_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix || path.startsWith(prefix + "/"),
  );
  return htmlOnly ? "html-only" : "not-found";
}

function marketing(locale: AgentLocale) {
  return (locale === "en" ? enMessages : frMessages).marketing;
}

const labels = {
  fr: { fullPage: "Page complète", discover: "Pages à consulter", facts: "À savoir", steps: "Comment ça marche", faq: "Questions fréquentes", docs: "Plan du site", llms: "Guide pour agents (llms.txt)", contact: "Contact" },
  en: { fullPage: "Full page", discover: "Pages to read", facts: "Key facts", steps: "How it works", faq: "Frequently asked questions", docs: "Sitemap", llms: "Agent guide (llms.txt)", contact: "Contact" },
} as const;

const facts = {
  fr: [
    "Kalivoa ne place aucun pari et ne donne aucun conseil de pari ni promesse de gain.",
    "L’utilisateur vérifie et corrige les paris extraits avant enregistrement.",
    "Kalivoa ne demande jamais les identifiants d’un bookmaker.",
    "Profils de lecture validés : Winamax, Betclic, Unibet, Bet365, PEC.bet.",
  ],
  en: [
    "Kalivoa does not place bets and gives no betting advice or promise of winnings.",
    "Users review and correct extracted bets before saving.",
    "Kalivoa never asks for bookmaker login credentials.",
    "Validated reading profiles: Winamax, Betclic, Unibet, Bet365, PEC.bet.",
  ],
} as const;

function footer(locale: AgentLocale): string[] {
  const l = labels[locale];
  return [
    `- [${l.docs}](${getSiteUrlForPath("/sitemap.xml")})`,
    `- [${l.llms}](${getSiteUrlForPath("/llms.txt")})`,
    `- ${l.contact}: ${COMPANY.publicEmail}`,
  ];
}

function renderHome(locale: AgentLocale): string {
  const m = marketing(locale);
  const l = labels[locale];
  const stepItems = Object.values(m.steps.items) as { title: string; description: string }[];
  const faqItems = Object.values(m.faq.items) as { question: string; answer: string }[];
  const en = locale === "en";
  const links: [string, string][] = [
    ["/features", en ? "Features" : "Fonctionnalités"],
    ["/screenshot-import", en ? "Screenshot import" : "Import de captures"],
    ["/bookmakers", "Bookmakers"],
    ["/pricing", en ? "Pricing" : "Tarifs"],
    ["/faq", "FAQ"],
    ["/about", en ? "About" : "À propos"],
    ["/contact", "Contact"],
  ];
  return [
    "# Kalivoa",
    "",
    `> ${m.hero.title} ${m.hero.description}`,
    "",
    `## ${l.facts}`,
    ...facts[locale].map((f) => `- ${f}`),
    "",
    `## ${l.steps}`,
    ...stepItems.map((s, i) => `${i + 1}. **${s.title}** — ${s.description}`),
    "",
    `## ${l.discover}`,
    ...links.map(([path, label]) => `- [${label}](${getSiteUrlForPath(`/${locale}${path}`)})`),
    "",
    `## ${l.faq}`,
    ...faqItems.flatMap((f) => [`### ${f.question}`, f.answer, ""]),
    ...footer(locale),
    "",
  ].join("\n");
}

function renderAbout(locale: AgentLocale): string {
  const about = aboutCopy[locale];
  return [
    `# ${about.title}`,
    "",
    `> ${about.intro}`,
    "",
    ...about.sections.flatMap((s) => [`## ${s.title}`, s.body, ""]),
    ...footer(locale),
    "",
  ].join("\n");
}

function renderMetaPage(locale: AgentLocale, path: string, metaKey: string): string {
  const meta = (marketing(locale).meta as Record<string, { title: string; description: string }>)[metaKey];
  return [
    `# ${meta.title}`,
    "",
    `> ${meta.description}`,
    "",
    `- [${labels[locale].fullPage}](${getSiteUrlForPath(`/${locale}${path}`)})`,
    `- [Kalivoa](${getSiteUrlForPath(`/${locale}`)})`,
    ...footer(locale),
    "",
  ].join("\n");
}

export function renderMarkdownPage(locale: AgentLocale, path: string): string | null {
  if (path === "") return renderHome(locale);
  if (path === "/about") return renderAbout(locale);
  const key = MARKDOWN_META_KEYS[path];
  return key ? renderMetaPage(locale, path, key) : null;
}

export function renderMarkdownNotFound(locale: AgentLocale, requestedPath: string): string {
  const safePath = requestedPath.replace(/[^\w\-./%~]/g, "").slice(0, 200) || "/";
  const fr = locale === "fr";
  return [
    `# 404 — ${fr ? "Page introuvable" : "Page not found"}`,
    "",
    fr
      ? `La page \`${safePath}\` n’existe pas sur Kalivoa. Elle a peut-être été déplacée ou l’adresse est incomplète.`
      : `The page \`${safePath}\` does not exist on Kalivoa. It may have moved or the address may be incomplete.`,
    "",
    `## ${fr ? "Où trouver l’information" : "Where to look instead"}`,
    `- [${fr ? "Accueil" : "Home"}](${getSiteUrlForPath(`/${locale}`)})`,
    `- [${labels[locale].docs}](${getSiteUrlForPath("/sitemap.xml")})`,
    `- [${labels[locale].llms}](${getSiteUrlForPath("/llms.txt")})`,
    "",
  ].join("\n");
}
