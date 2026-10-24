export const EMAIL_MARKETING_CONSENT_VERSION = "2026-10-24-v1";

export function emailMarketingCopy(locale: string) {
  return locale === "en" ? {
    title: "Kalivoa emails",
    label: "I would like to receive Kalivoa news and offers by email.",
    hint: "Optional. You can change your choice in your account at any time. Account and security emails are separate.",
    save: "Save my choice", decline: "No thanks", saving: "Saving…",
    saved: "Your email preference has been saved.", error: "Your choice could not be saved. Please try again.",
    privacy: "Privacy policy",
  } : {
    title: "Les e-mails Kalivoa",
    label: "Je souhaite recevoir par e-mail les nouveautés et offres de Kalivoa.",
    hint: "Facultatif. Tu peux modifier ton choix dans ton compte à tout moment. Les e-mails de compte et de sécurité sont distincts.",
    save: "Enregistrer mon choix", decline: "Non merci", saving: "Enregistrement…",
    saved: "Ta préférence e-mail a été enregistrée.", error: "Ton choix n’a pas pu être enregistré. Réessaie.",
    privacy: "Confidentialité",
  };
}
