import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { publicPerformance } from "@/lib/public-bankroll";
import { normalizePublicHandle } from "@/lib/public-tipster-profile";

export const alt = "Profil public d’un tipster Kalivoa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = await params;
  const handle = normalizePublicHandle(rawHandle);
  const tipster = await prisma.user.findFirst({
    where: { publicHandle: handle, bankrolls: { some: { isPublic: true, certificationStartedAt: { not: null } } } },
    select: { name: true, publicDisplayName: true, publicBio: true, bankrolls: { where: { isPublic: true, certificationStartedAt: { not: null }, publicSlug: { not: null } }, select: { bets: { select: { result: true, stakeUnits: true, odds: true, cashOutAmount: true, referenceCapitalAtBet: true, freebet: true } } } } },
  });
  const displayName = tipster?.publicDisplayName || tipster?.name || "Tipster Kalivoa";
  const bets = tipster?.bankrolls.flatMap((bankroll) => bankroll.bets) ?? [];
  const performance = publicPerformance(bets);
  const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  const profit = performance.profit === null ? "—" : `${performance.profit >= 0 ? "+" : ""}${number.format(performance.profit)}u`;

  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", padding: 64, color: "#f7f8fb", background: "linear-gradient(135deg, #090d14 0%, #111b2c 58%, #10283a 100%)", fontFamily: "sans-serif" }}><div style={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 34, fontWeight: 800 }}>Kali<span style={{ color: "#63a8ff" }}>voa</span></span><span style={{ color: "#62e6b5", fontSize: 20, fontWeight: 700 }}>Profil public vérifiable</span></div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#63a8ff", fontSize: 25, fontWeight: 700 }}>@{handle}</span><span style={{ marginTop: 14, fontSize: 68, lineHeight: 1, fontWeight: 800 }}>{displayName}</span><span style={{ marginTop: 20, maxWidth: 980, color: "#b7c0cf", fontSize: 25, lineHeight: 1.35 }}>{tipster?.publicBio || "Bankrolls et performances publiques en unités, avec niveau de preuve visible."}</span></div><div style={{ display: "flex", gap: 14 }}><Stat label="Bankrolls" value={String(tipster?.bankrolls.length ?? 0)} /><Stat label="Paris" value={String(bets.length)} /><Stat label="Bénéfice" value={profit} positive={performance.profit !== null && performance.profit >= 0} /><Stat label="ROI" value={performance.roi === null ? "—" : `${number.format(performance.roi)}%`} /></div></div></div>, size);
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "18px 20px", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, background: "rgba(8,12,20,.5)" }}><span style={{ color: "#9da8ba", fontSize: 16 }}>{label}</span><strong style={{ marginTop: 6, color: positive ? "#62e6b5" : "#f7f8fb", fontSize: 30 }}>{value}</strong></div>; }
