/** Map equivalent football player markets without depending on bookmaker names. */
function marketKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr").replace(/\//g, " ou ").replace(/[^a-z0-9]+/g, " ").trim();
}

function playerMarket(value: string): "combined" | "assist" | "scorer" | null {
  const text = marketKey(value);
  const scorer = /\b(?:buteur|marqueur|scorer|goalscorer|score|scores|but|goal)\b/.test(text);
  const assist = /\b(?:passeur|passe|assist|assists|assister)\b/.test(text);
  if (scorer && assist && /\b(?:ou|or)\b/.test(text)) return "combined";
  if (/\b(?:joueur )?decisif\b/.test(text) && !/\b(?:passeur|passe)\b/.test(text)) return "combined";
  if (/\b(?:passeur decisif|passe decisive|assists?|assister)\b/.test(text)) return "assist";
  if (/\b(?:buteur|marqueur|goalscorer)\b/.test(text)) return "scorer";
  return null;
}

export function normalizeScannedMarketType(sport: string, extractedType: string, visibleMarketTexts: string[] = []) {
  if (sport !== "Football") return extractedType;
  // Visible ticket wording takes priority over a type inferred by the model.
  const visibleMarket = visibleMarketTexts.map(playerMarket).find((market) => market !== null);
  const market = visibleMarket ?? playerMarket(extractedType);
  if (market === "combined") return "Buteur ou passeur";
  if (market === "assist") return "Passeur décisif";
  if (market === "scorer") return "Buteur";
  return extractedType;
}
