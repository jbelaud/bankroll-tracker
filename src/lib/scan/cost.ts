// Tarifs API publics Claude Haiku 4.5, en dollars par token.
// Chaque ScanUsage conserve le coût final pour que ce changement éventuel ne
// réécrive jamais l'historique financier.
export const SCAN_MODEL = "claude-haiku-4-5";
const INPUT_COST_PER_TOKEN_USD = 1 / 1_000_000;
const OUTPUT_COST_PER_TOKEN_USD = 5 / 1_000_000;

export function calculateScanCostUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_COST_PER_TOKEN_USD + outputTokens * OUTPUT_COST_PER_TOKEN_USD;
}
