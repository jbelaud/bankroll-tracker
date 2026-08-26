import type { ParsedBet } from "./types";

export type ScanTicketResult = {
  /** Index de la capture d'origine, conservé si une autre capture du lot est ignorée. */
  sourceFileIndex: number;
  usageId: string;
  bets: ParsedBet[];
  rawExtraction: unknown;
  model: string;
  supportStatus: "TESTED" | "UNTESTED" | "VALIDATING";
  detectedBookmaker: string | null;
  detectionConfidence: number | null;
  earnedReferralScans: number;
  outcome: "READY" | "EMPTY";
};

// Appelle la vraie route d'extraction (POST /api/scan) une image à la fois,
// ce qui permet d'afficher la progression « Analyse N/M ». La clé API vit
// exclusivement côté serveur dans la route — jamais ici.
export async function scanTickets(
  images: File[],
  bankrollId: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ bets: ParsedBet[]; scans: ScanTicketResult[]; skippedDuplicateFiles: string[] }> {
  const total = images.length;
  const all: ParsedBet[] = [];
  const seenRefs = new Set<string>();
  const scans: ScanTicketResult[] = [];
  const skippedDuplicateFiles: string[] = [];

  for (let i = 0; i < total; i++) {
    const form = new FormData();
    form.append("image", images[i]);
    form.append("bankrollId", bankrollId);

    const res = await fetch("/api/scan", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Une capture déjà importée ou avec une revue en attente ne doit pas
      // empêcher l'analyse des autres fichiers du lot. Le serveur précise
      // explicitement laquelle des deux situations s'applique.
      if (res.status === 409) {
        const reason = typeof data.error === "string" ? data.error : "Capture déjà analysée.";
        skippedDuplicateFiles.push(`${images[i].name} — ${reason}`);
        onProgress?.(i + 1, total);
        continue;
      }
      throw new Error(data.error || "L'analyse du ticket a échoué.");
    }
    const { bets, scan } = (await res.json()) as {
      bets: ParsedBet[];
      scan: {
        usageId: string;
        rawExtraction: unknown;
        model: string;
        supportStatus: ScanTicketResult["supportStatus"];
        detectedBookmaker: string | null;
        detectionConfidence: number | null;
        earnedReferralScans: number;
        outcome?: ScanTicketResult["outcome"];
      };
    };
    const sourcedBets = bets.map((bet) => ({ ...bet, sourceScanIndex: i }));
    scans.push({
      sourceFileIndex: i,
      usageId: scan.usageId,
      bets: sourcedBets,
      rawExtraction: scan.rawExtraction,
      model: scan.model,
      supportStatus: scan.supportStatus,
      detectedBookmaker: scan.detectedBookmaker,
      detectionConfidence: scan.detectionConfidence,
      earnedReferralScans: scan.earnedReferralScans,
      outcome: scan.outcome ?? "READY",
    });

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

  return { bets: all, scans, skippedDuplicateFiles };
}
