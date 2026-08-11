import type { ParsedBet } from "./types";

export type ScanTicketResult = {
  bets: ParsedBet[];
  rawExtraction: unknown;
  model: string;
  supportStatus: "TESTED" | "UNTESTED" | "VALIDATING";
};

// Appelle la vraie route d'extraction (POST /api/scan) une image à la fois,
// ce qui permet d'afficher la progression « Analyse N/M ». La clé API vit
// exclusivement côté serveur dans la route — jamais ici.
export async function scanTickets(
  images: File[],
  bankrollId: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ bets: ParsedBet[]; scans: ScanTicketResult[] }> {
  const total = images.length;
  const all: ParsedBet[] = [];
  const seenRefs = new Set<string>();
  const scans: ScanTicketResult[] = [];

  for (let i = 0; i < total; i++) {
    const form = new FormData();
    form.append("image", images[i]);
    form.append("bankrollId", bankrollId);

    const res = await fetch("/api/scan", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "L'analyse du ticket a échoué.");
    }
    const { bets, scan } = (await res.json()) as {
      bets: ParsedBet[];
      scan: { rawExtraction: unknown; model: string; supportStatus: ScanTicketResult["supportStatus"] };
    };
    const sourcedBets = bets.map((bet) => ({ ...bet, sourceScanIndex: i }));
    scans.push({ bets: sourcedBets, rawExtraction: scan.rawExtraction, model: scan.model, supportStatus: scan.supportStatus });

    // Dédup intra-lot par référence de ticket (une même ref sur deux captures).
    for (const bet of sourcedBets) {
      if (bet.ticketRef) {
        if (seenRefs.has(bet.ticketRef)) continue;
        seenRefs.add(bet.ticketRef);
      }
      all.push(bet);
    }

    onProgress?.(i + 1, total);
  }

  return { bets: all, scans };
}
