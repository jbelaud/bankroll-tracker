import { getSiteUrlForPath } from "@/lib/site";

export function GET() {
  const site = getSiteUrlForPath();
  const content = [
    "# Kalivoa",
    "",
    "> Kalivoa is an independent sports-betting bankroll tracking web application. It imports betting-slip screenshots for user review before saving them to a private history.",
    "",
    "## Canonical public pages",
    `- [Accueil — français](${site}fr)`,
    `- [Home — English](${site}en)`,
    `- [Import de captures — français](${getSiteUrlForPath("/fr/screenshot-import")})`,
    `- [Screenshot import — English](${getSiteUrlForPath("/en/screenshot-import")})`,
    `- [Fonctionnalités — français](${getSiteUrlForPath("/fr/features")})`,
    `- [Features — English](${getSiteUrlForPath("/en/features")})`,
    `- [Certification — français](${getSiteUrlForPath("/fr/certification")})`,
    `- [Certification — English](${getSiteUrlForPath("/en/certification")})`,
    `- [Bookmakers — français](${getSiteUrlForPath("/fr/bookmakers")})`,
    `- [Bookmakers — English](${getSiteUrlForPath("/en/bookmakers")})`,
    `- [Tarifs — français](${getSiteUrlForPath("/fr/pricing")})`,
    `- [Pricing — English](${getSiteUrlForPath("/en/pricing")})`,
    `- [FAQ — français](${getSiteUrlForPath("/fr/faq")})`,
    `- [FAQ — English](${getSiteUrlForPath("/en/faq")})`,
    "",
    "## Important facts",
    "- Kalivoa does not place bets and does not provide betting advice or profit guarantees.",
    "- Users review and can correct extracted information before saving it.",
    "- Bankroll certification describes recorded evidence, timestamps and corrections. Its evidence score is separate from performance; it is not a bookmaker audit or official accreditation.",
    "- Validated screenshot-import profiles are Winamax, Betclic, Unibet, Bet365 and PEC.bet.",
    "- Kalivoa does not request bookmaker login credentials.",
    "- Kalivoa is published by ETS BELAUD (French SASU); public support: contact.kalivoa@gmail.com.",
    "- Prepared paid plans and welcome offer conditions are described on the pricing pages. Payments remain closed during beta.",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
