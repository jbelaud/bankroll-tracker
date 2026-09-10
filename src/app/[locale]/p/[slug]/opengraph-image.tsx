import { ImageResponse } from "next/og";
import { certificationSummary } from "@/lib/certification";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";

export const alt = "Bankroll publique Kalivoa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bankroll = await prisma.bankroll.findFirst({
    where: { publicSlug: slug, isPublic: true, certificationStartedAt: { not: null } },
    select: {
      name: true, certificationStartedAt: true, publicSports: true,
      user: { select: { name: true, publicDisplayName: true, publicHandle: true } },
      bets: { select: { createdAt: true, result: true, stakeUnits: true, odds: true, cashOutAmount: true, referenceCapitalAtBet: true, freebet: true, entryMethod: true, initialProofAt: true, initialProofBeforeEvent: true, resultProofAt: true, resultEntryMethod: true } },
    },
  });
  const displayName = bankroll?.user.publicDisplayName || bankroll?.user.name || "Tipster Kalivoa";
  const performance = publicPerformance(bankroll?.bets ?? []);
  const certification = certificationSummary(bankroll?.bets ?? [], bankroll?.certificationStartedAt ?? null);
  const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  const profit = performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`;

  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", padding: 64, color: "#f7f8fb", background: "linear-gradient(135deg, #090d14 0%, #111b2c 58%, #10283a 100%)", fontFamily: "sans-serif" }}>
    <div style={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 34, fontWeight: 800 }}>Kali<span style={{ color: "#63a8ff" }}>voa</span></span><span style={{ display: "flex", padding: "10px 18px", borderRadius: 999, background: "rgba(57,220,160,.14)", color: "#62e6b5", fontSize: 20, fontWeight: 700 }}>Bankroll publique</span></div>
      <div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#63a8ff", fontSize: 24, fontWeight: 700 }}>@{bankroll?.user.publicHandle || "kalivoa"} · {displayName}</span><span style={{ marginTop: 16, maxWidth: 980, fontSize: 62, lineHeight: 1.05, fontWeight: 800 }}>{bankroll?.name || "Bankroll publique"}</span>{bankroll?.publicSports.length ? <div style={{ display: "flex", marginTop: 22, gap: 10 }}>{bankroll.publicSports.slice(0, 5).map((sport) => <span key={sport} style={{ display: "flex", padding: "8px 14px", borderRadius: 999, background: "rgba(99,168,255,.12)", color: "#b8d4ff", fontSize: 18 }}>{sport}</span>)}</div> : null}</div>
      <div style={{ display: "flex", gap: 14 }}><Stat label="Paris" value={String(bankroll?.bets.length ?? 0)} /><Stat label="Bénéfice" value={profit} positive={performance.profit !== null && performance.profit >= 0} /><Stat label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} /><Stat label="Score de preuve" value={certification.score === null ? "Observation" : `${certification.score}/100`} /></div>
    </div>
  </div>, size);
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "18px 20px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, background: "rgba(8,12,20,.5)" }}><span style={{ color: "#9da8ba", fontSize: 16 }}>{label}</span><strong style={{ marginTop: 6, color: positive ? "#62e6b5" : "#f7f8fb", fontSize: 30 }}>{value}</strong></div>; }
