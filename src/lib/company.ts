/** Public corporate details from the owner's listing and confirmed contact details. */
export const COMPANY = {
  publicBrand: "Kalivoa",
  name: "ETS BELAUD",
  legalForm: "SASU",
  shareCapitalEuros: 500,
  registeredAddress: "61 rue de Lyon, 75012 Paris, France",
  siren: "994 223 212",
  registeredOfficeSiret: "994 223 212 00014",
  commercialRegister: "994 223 212 RCS Paris",
  president: "Jérémy BELAUD",
  publicEmail: "contact.kalivoa@gmail.com",
  publicPhone: "07 81 08 48 35",
  publicPhoneInternational: "+33 7 81 08 48 35",
  publicPhoneHref: "tel:+33781084835",
  vatRegime: "Réel simplifié — déclaration CA12",
  reportedVatNumber: "FR61994223212",
  vatNumber: "FR61994223212",
  source: "https://www.pappers.fr/entreprise/ets-belaud-994223212",
} as const;

export function companyIdentification(locale: "fr" | "en"): string {
  return locale === "fr"
    ? `${COMPANY.name}, société par actions simplifiée unipersonnelle (SASU) au capital de ${COMPANY.shareCapitalEuros} €, dont le siège social est situé ${COMPANY.registeredAddress}, immatriculée sous le numéro ${COMPANY.commercialRegister} (SIREN ${COMPANY.siren}, SIRET du siège ${COMPANY.registeredOfficeSiret})`
    : `${COMPANY.name}, a French single-member simplified joint-stock company (SASU) with share capital of €${COMPANY.shareCapitalEuros}, registered office at ${COMPANY.registeredAddress}, registered under ${COMPANY.commercialRegister} (SIREN ${COMPANY.siren}, registered-office SIRET ${COMPANY.registeredOfficeSiret})`;
}
