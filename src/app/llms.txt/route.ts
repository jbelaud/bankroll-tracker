import { getSiteUrlForPath } from "@/lib/site";

export function GET() {
  const site = getSiteUrlForPath();
  const content = [
    "# BetTrack",
    "",
    "> BetTrack is an independent sports-betting bankroll tracking web application. It imports betting-slip screenshots for user review before saving them to a private history.",
    "",
    "## Canonical public pages",
    "- " + site + "fr",
    "- " + site + "en",
    "- " + getSiteUrlForPath("/fr/screenshot-import"),
    "- " + getSiteUrlForPath("/en/screenshot-import"),
    "- " + getSiteUrlForPath("/fr/features"),
    "- " + getSiteUrlForPath("/en/features"),
    "- " + getSiteUrlForPath("/fr/bookmakers"),
    "- " + getSiteUrlForPath("/en/bookmakers"),
    "- " + getSiteUrlForPath("/fr/faq"),
    "- " + getSiteUrlForPath("/en/faq"),
    "",
    "## Important facts",
    "- BetTrack does not place bets and does not provide betting advice or profit guarantees.",
    "- Users review and can correct extracted information before saving it.",
    "- Validated screenshot-import profiles are Winamax, Betclic, Unibet, Bet365 and PEC.bet.",
    "- BetTrack does not request bookmaker login credentials.",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
