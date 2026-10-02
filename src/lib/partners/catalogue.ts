import type { Locale } from "@/i18n/routing";

export type PartnerSection = "bookmakers" | "tools";
export type PartnerStatus = "ACTIVE" | "COMING_SOON" | "PREPARATION" | "UNAVAILABLE" | "ARCHIVED";
export type PartnerCategory = "bookmaker" | "odds" | "data" | "community" | "training" | "other";
export type LocalizedText = Record<Locale, string>;
export type PartnerScanReward = {
  campaignId: string;
  quantity: number;
  expiresAfterDays: number | null;
  conditions: LocalizedText;
  stackable: boolean;
};
export type PartnerEntry = {
  id: string;
  name: string;
  section: PartnerSection;
  category: PartnerCategory;
  status: PartnerStatus;
  description: LocalizedText;
  details: LocalizedText;
  offer?: LocalizedText;
  conditions: LocalizedText;
  statusNote?: LocalizedText;
  href?: string;
  conditionsHref?: string;
  promoCode?: string;
  logo?: { src: string; alt: LocalizedText };
  offerExpiresAt?: string;
  featured: boolean;
  order: number;
  // Configurer uniquement une récompense approuvée et sa validation serveur.
  scanReward?: PartnerScanReward;
};

// Récompense approuvée : 30 scans permanents par offre bookmaker validée.
function bookmakerScanReward(bookmakerId: string): PartnerScanReward {
  return {
    campaignId: `${bookmakerId}-referral-permanent-30-v1`,
    quantity: 30,
    expiresAfterDays: null,
    stackable: true,
    conditions: {
      fr: "30 scans permanents après validation du parrainage par Kalivoa, en utilisant le lien ou le code indiqué et en respectant les conditions du bookmaker. Une attribution par compte Kalivoa et par offre, cumulable avec les autres offres bookmakers. Un clic ou une copie du code ne suffit pas.",
      en: "30 permanent scans after Kalivoa validates the referral, using the listed link or code and meeting the bookmaker’s terms. One award per Kalivoa account and offer, combinable with other bookmaker offers. Clicking a link or copying a code is not enough.",
    },
  };
}

// Liens transmis par le propriétaire de Kalivoa.
export const PARTNER_CATALOGUE: readonly PartnerEntry[] = [
  {
    id: "winamax", name: "Winamax", section: "bookmakers", category: "bookmaker", status: "ACTIVE", order: 10, featured: false,
    description: { fr: "Un lien de parrainage pour découvrir l’offre Winamax.", en: "A referral link to explore Winamax’s offer." },
    details: { fr: "Le bonus et les modalités applicables sont précisés par Winamax lors de l’inscription. Consultez-les avant de décider.", en: "Winamax specifies the applicable bonus and terms during registration. Review them before deciding." },
    offer: { fr: "Parrainage · bonus sous conditions", en: "Referral · bonus subject to conditions" },
    conditions: { fr: "Réservé aux personnes majeures et éligibles au parrainage. Le lien ne garantit ni l’éligibilité ni un montant de bonus. Les conditions Winamax s’appliquent.", en: "For adults eligible for referrals. The link guarantees neither eligibility nor a bonus amount. Winamax’s terms apply." },
    href: "https://www.winamax.fr/parrain?code=WITJ1Y", promoCode: "WITJ1Y",
    conditionsHref: "https://www.winamax.fr/parrain?code=WITJ1Y",
    scanReward: bookmakerScanReward("winamax"),
  },
  {
    id: "betclic", name: "Betclic", section: "bookmakers", category: "bookmaker", status: "ACTIVE", order: 20, featured: false,
    description: { fr: "Un parrainage avec un bonus en paris gratuits pour les nouveaux clients éligibles.", en: "A referral with a free-bet bonus for eligible new customers." },
    details: { fr: "Les conditions de parrainage Betclic prévoient un bonus de 10 € en paris gratuits, sous réserve de remplir les conditions de l’offre.", en: "Betclic’s referral terms provide a €10 free-bet bonus, subject to meeting the offer’s conditions." },
    offer: { fr: "10 € en paris gratuits · sous conditions", en: "€10 in free bets · subject to conditions" },
    conditions: { fr: "18 ans minimum. Premier compte Sport, code indiqué à l’inscription, compte validé, premier dépôt d’au moins 10 € et activation de la mission Défi Bienvenue. Conditions à remplir sous 60 jours. Le bonus n’est pas une somme directement retirable.", en: "18 or over. First Sport account, referral code entered at registration, verified account, first deposit of at least €10 and activation of the Welcome Challenge mission. Complete the conditions within 60 days. The bonus is not directly withdrawable cash." },
    href: "https://betclic.onelink.me/2887093520/6c3132b8?af_sub5=ANDRJ5Q9", promoCode: "ANDRJ5Q9",
    conditionsHref: "https://dam.begmedia.com/account/terms-and-conditions/BetclicFr/Fr/TermsAndConditions.html",
    scanReward: bookmakerScanReward("betclic"),
  },
  {
    id: "pmu", name: "PMU", section: "bookmakers", category: "bookmaker", status: "UNAVAILABLE", order: 30, featured: false,
    description: { fr: "Le lien de parrainage PMU transmis à Kalivoa.", en: "The PMU referral link provided to Kalivoa." },
    details: { fr: "Les conditions actuelles de cette offre restent à confirmer. Aucun montant de bonus n’est annoncé ici.", en: "The current terms of this offer still need confirmation. No bonus amount is advertised here." },
    statusNote: { fr: "Conditions à confirmer", en: "Terms awaiting confirmation" },
    conditions: { fr: "La page de l’offre retrouvée présente une ancienne période de validité. Les modalités actuelles doivent être confirmées avant son activation.", en: "The offer page found shows an old validity period. Current terms must be confirmed before activation." },
    href: "https://www.pmu.fr/turf/static/offre-parrainage/?codeParrainage=670431679", promoCode: "670431679",
    conditionsHref: "https://www.pmu.fr/turf/static/offre-parrainage/?codeParrainage=670431679",
    scanReward: bookmakerScanReward("pmu"),
  },
  {
    id: "unibet", name: "Unibet", section: "bookmakers", category: "bookmaker", status: "ACTIVE", order: 40, featured: false,
    description: { fr: "Un lien de parrainage Unibet, avec les modalités publiées par le bookmaker.", en: "An Unibet referral link, with terms published by the bookmaker." },
    details: { fr: "Vérifiez votre éligibilité et les conditions du bonus avant toute inscription. La campagne actuelle a une durée limitée.", en: "Check your eligibility and the bonus terms before registering. The current campaign runs for a limited period." },
    offer: { fr: "Parrainage · bonus sous conditions", en: "Referral · bonus subject to conditions" },
    conditions: { fr: "18 ans minimum. Offre jusqu’au 12 octobre 2026 inclus : inscription via le lien du parrain, premier dépôt d’au moins 5 € et compte validé sous 60 jours. Les exclusions d’éligibilité et les conditions complètes Unibet s’appliquent.", en: "18 or over. Offer until 12 October 2026 inclusive: register through the referral link, first deposit of at least €5 and account verified within 60 days. Unibet’s eligibility exclusions and full terms apply." },
    href: "https://www.unibet.fr/inscription/?campaign=110926&parrain=0C7483C95EB3D26D",
    conditionsHref: "https://www.unibet.fr/paris-sportifs/parrainage",
    offerExpiresAt: "2026-10-12T21:59:59.999Z",
    scanReward: bookmakerScanReward("unibet"),
  },
  {
    id: "betcroissant", name: "BetCroissant", section: "tools", category: "odds", status: "PREPARATION", order: 10, featured: false,
    description: { fr: "Analyse des cotes et alertes pour aider à repérer des opportunités intéressantes.", en: "Odds analysis and alerts to help identify interesting opportunities." },
    details: { fr: "Une collaboration avec BetCroissant est en discussion. Les services et avantages proposés aux utilisateurs de Kalivoa seront précisés si elle est confirmée.", en: "A collaboration with BetCroissant is under discussion. Services and benefits for Kalivoa users will be detailed if it is confirmed." },
    statusNote: { fr: "Collaboration à l’étude", en: "Collaboration under discussion" },
    conditions: { fr: "Aucun partenariat officiel ni avantage confirmé à ce stade.", en: "No official partnership or confirmed benefit at this stage." },
  },
];

export type PublicPartner = Omit<PartnerEntry, "scanReward" | "href" | "conditionsHref" | "promoCode"> & {
  href?: string;
  conditionsHref?: string;
  promoCode?: string;
  scanReward?: Pick<PartnerScanReward, "quantity" | "expiresAfterDays" | "conditions">;
};

export function safePartnerUrl(value?: string): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return value;
  } catch { /* Une URL invalide ne doit jamais devenir une action publique. */ }
}

export function partnerIsActive(partner: PartnerEntry, now: Date): boolean {
  return partner.status === "ACTIVE" && (!partner.offerExpiresAt ||
    (Number.isFinite(Date.parse(partner.offerExpiresAt)) && Date.parse(partner.offerExpiresAt) > now.getTime()));
}

export function validPartnerScanReward(reward: PartnerScanReward): boolean {
  return Number.isSafeInteger(reward.quantity) && reward.quantity > 0 && reward.quantity <= 2_147_483_647 &&
    (reward.expiresAfterDays === null || (Number.isSafeInteger(reward.expiresAfterDays) && reward.expiresAfterDays > 0 && reward.expiresAfterDays <= 36_500)) &&
    Boolean(reward.campaignId.trim() && reward.conditions.fr.trim() && reward.conditions.en.trim());
}

export function getPublicPartners(now = new Date(), catalogue = PARTNER_CATALOGUE): PublicPartner[] {
  return catalogue.filter((p) => p.status !== "ARCHIVED").map((partner): PublicPartner => {
    const { scanReward, href, conditionsHref, promoCode, ...rest } = partner;
    const active = partnerIsActive(partner, now);
    return {
      ...rest,
      offerExpiresAt: rest.offerExpiresAt && Number.isFinite(Date.parse(rest.offerExpiresAt)) ? rest.offerExpiresAt : undefined,
      status: partner.status === "ACTIVE" && !active ? "UNAVAILABLE" : partner.status,
      offer: active ? rest.offer : undefined,
      href: active ? safePartnerUrl(href) : undefined,
      conditionsHref: partner.status === "PREPARATION" ? undefined : safePartnerUrl(conditionsHref),
      promoCode: active ? promoCode : undefined,
      scanReward: active && scanReward && validPartnerScanReward(scanReward) ? {
        quantity: scanReward.quantity, expiresAfterDays: scanReward.expiresAfterDays, conditions: scanReward.conditions,
      } : undefined,
    };
  }).sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order || a.id.localeCompare(b.id));
}
