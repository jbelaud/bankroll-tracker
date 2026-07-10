import type { ParsedBet } from "./types";

// Appelle la vraie route d'extraction (POST /api/scan) une image à la fois,
// ce qui permet d'afficher la progression « Analyse N/M ». La clé API vit
// exclusivement côté serveur dans la route — jamais ici.
export async function scanTickets(
  images: File[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedBet[]> {
  const total = images.length;
  const all: ParsedBet[] = [];
  const seenRefs = new Set<string>();

  for (let i = 0; i < total; i++) {
    const form = new FormData();
    form.append("image", images[i]);

    const res = await fetch("/api/scan", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "L'analyse du ticket a échoué.");
    }
    const { bets } = (await res.json()) as { bets: ParsedBet[] };

    // Dédup intra-lot par référence de ticket (une même ref sur deux captures).
    for (const bet of bets) {
      if (bet.ticketRef) {
        if (seenRefs.has(bet.ticketRef)) continue;
        seenRefs.add(bet.ticketRef);
      }
      all.push(bet);
    }

    onProgress?.(i + 1, total);
  }

  return all;
}
