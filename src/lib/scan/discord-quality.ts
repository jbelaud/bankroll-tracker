import "server-only";

import type { QualityIssueType } from "./quality";

const ISSUE_LABELS: Record<QualityIssueType, string> = {
  INCORRECT: "Extraction incorrecte",
  INCOMPLETE: "Extraction incomplète",
  OTHER: "Autre problème",
};

export async function sendQualityReportToDiscord({
  reportId,
  issueType,
}: {
  reportId: string;
  bookmaker: string;
  issueType: QualityIssueType;
  issueDetails: string | null;
  image: File;
}) {
  const webhookUrl = process.env.DISCORD_SCAN_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) return { sent: false, reason: "not-configured" as const };

  // Une URL de webhook Discord est un secret : ne jamais la transmettre au client.
  let url: URL;
  try {
    url = new URL(webhookUrl);
  } catch {
    console.error("[scan-quality] invalid Discord webhook URL");
    return { sent: false, reason: "invalid-url" as const };
  }
  if (url.protocol !== "https:" || url.hostname !== "discord.com") {
    console.error("[scan-quality] Discord webhook URL must target discord.com over HTTPS");
    return { sent: false, reason: "invalid-url" as const };
  }

  const payload = {
    username: "Kalivoa · Scan bêta",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: "Nouveau signalement de scan",
      url: "https://kalivoa.com/fr/admin",
      description: "Consulter le signalement dans l’espace administrateur authentifié de Kalivoa.",
      color: 0x5865F2,
      fields: [
        { name: "Type", value: ISSUE_LABELS[issueType], inline: true },
        { name: "Rapport", value: reportId, inline: false },
      ],
    }],
  };
  try {
    // Captures and free-text comments stay in Kalivoa's private report storage.
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      console.error("[scan-quality] Discord webhook failed", response.status);
      return { sent: false, reason: "failed" as const };
    }
    return { sent: true as const };
  } catch {
    console.error("[scan-quality] Discord webhook failed");
    return { sent: false, reason: "failed" as const };
  }
}
