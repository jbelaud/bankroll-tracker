import "server-only";

import type { QualityIssueType } from "./quality";

const ISSUE_LABELS: Record<QualityIssueType, string> = {
  INCORRECT: "Extraction incorrecte",
  INCOMPLETE: "Extraction incomplète",
  OTHER: "Autre problème",
};

export async function sendQualityReportToDiscord({
  reportId,
  bookmaker,
  issueType,
  issueDetails,
  image,
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
    username: "BetTrack · Scan bêta",
    embeds: [{
      title: "Nouveau signalement de scan",
      color: 0x5865F2,
      fields: [
        { name: "Type", value: ISSUE_LABELS[issueType], inline: true },
        { name: "Bookmaker", value: bookmaker.slice(0, 100), inline: true },
        { name: "Rapport", value: reportId, inline: false },
        ...(issueDetails ? [{ name: "Précision", value: issueDetails.slice(0, 1_000), inline: false }] : []),
      ],
    }],
  };
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  form.append("files[0]", image, `scan.${image.type.split("/")[1] ?? "png"}`);

  try {
    const response = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      console.error("[scan-quality] Discord webhook failed", response.status);
      return { sent: false, reason: "failed" as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("[scan-quality] Discord webhook failed", error);
    return { sent: false, reason: "failed" as const };
  }
}
