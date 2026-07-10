import { getTranslations } from "next-intl/server";

// Bandeau jeu responsable — global à toute l'app, posé une seule fois par
// le layout racine (src/app/[locale]/layout.tsx). C'est l'élément qui touche
// réellement le bord physique de l'écran (safe-area) ; sur les routes
// (app), AppNav se repositionne juste au-dessus via --rg-footer-h.
export async function ResponsibleGamblingFooter() {
  const t = await getTranslations("footer");

  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <p className="mx-auto flex h-[var(--rg-footer-h)] max-w-md items-center justify-center overflow-hidden whitespace-nowrap px-4 text-center text-[0.6rem] text-muted-foreground">
        {t("label")}{" "}
        <a
          href="https://www.joueurs-info-service.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1 underline underline-offset-2"
        >
          joueurs-info-service.fr
        </a>{" "}
        · 09 74 75 13 13
      </p>
    </footer>
  );
}
