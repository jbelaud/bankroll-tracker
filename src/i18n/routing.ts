import { defineRouting } from "next-intl/routing";

// Français par défaut, anglais en deuxième langue. Préfixe toujours présent
// (/fr/..., /en/...) — cf. AGENTS.md pour le pattern de routing choisi.
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
});

export type Locale = (typeof routing.locales)[number];
