import { getSiteUrlForPath } from "@/lib/site";

export function GET() {
  const publicPages = [
    ["/fr", "Accueil — français"],
    ["/en", "Home — English"],
    ["/fr/screenshot-import", "Import de captures — français"],
    ["/en/screenshot-import", "Screenshot import — English"],
    ["/fr/features", "Fonctionnalités — français"],
    ["/en/features", "Features — English"],
    ["/fr/bookmakers", "Bookmakers — français"],
    ["/en/bookmakers", "Bookmakers — English"],
    ["/fr/faq", "FAQ — français"],
    ["/en/faq", "FAQ — English"],
  ];
  const content = [
    "# Kalivoa",
    "",
    "> Kalivoa is an independent sports-betting bankroll tracking web application. It imports betting-slip screenshots for user review before saving them to a private history.",
    "",
    "## Canonical public pages",
    ...publicPages.map(([path, label]) => `- [${label}](${getSiteUrlForPath(path)})`),
    "",
    "## Important facts",
    "- Kalivoa does not place bets and does not provide betting advice or profit guarantees.",
    "- Users review and can correct extracted information before saving it.",
    "- Validated screenshot-import profiles are Winamax, Betclic, Unibet, Bet365 and PEC.bet.",
    "- Kalivoa does not request bookmaker login credentials.",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
