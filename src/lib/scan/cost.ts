// Tarifs API publics, en dollars par token.
// Chaque ScanUsage conserve le coût final pour que ce changement éventuel ne
// réécrive jamais l'historique financier.
const PRICES_PER_MILLION_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
};

// Tarif de lancement Google jusqu'au 31 décembre 2026 inclus.
function gemini36FlashPrices(): { input: number; output: number } {
  return Date.now() < Date.UTC(2027, 0, 1)
    ? { input: 0.75, output: 3.75 }
    : { input: 1.5, output: 7.5 };
}

export function calculateScanCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = model === "gemini-3.6-flash"
    ? gemini36FlashPrices()
    : PRICES_PER_MILLION_TOKENS_USD[model];
  if (!prices) throw new Error(`Tarification inconnue pour le modèle ${model}`);
  return (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;
}
