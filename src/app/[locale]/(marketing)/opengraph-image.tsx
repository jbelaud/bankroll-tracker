import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BetTrack — Screenshot import and bankroll tracking";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 64,
          color: "#f4f5f7",
          background: "linear-gradient(135deg, #0b0d12 0%, #101827 58%, #0b2030 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
            <div style={{ display: "flex", width: 54, height: 54, borderRadius: 16, background: "#75a7ff", color: "#0b0d12", alignItems: "center", justifyContent: "center" }}>↗</div>
            <span>Bet<span style={{ color: "#75a7ff" }}>Track</span></span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 850 }}>
            <span style={{ color: "#75a7ff", fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>BANKROLL TRACKING</span>
            <span style={{ marginTop: 22, fontSize: 70, fontWeight: 700, lineHeight: 1.08 }}>Import your betting slips from screenshots.</span>
            <span style={{ marginTop: 25, color: "#b6becd", fontSize: 28, lineHeight: 1.4 }}>Review extracted information, then follow your history and statistics.</span>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ display: "flex", padding: "10px 16px", borderRadius: 20, background: "rgba(117,167,255,0.16)", color: "#b7d0ff", fontSize: 20 }}>Review before saving</span>
            <span style={{ display: "flex", padding: "10px 16px", borderRadius: 20, background: "rgba(46,232,165,0.12)", color: "#8ff4ca", fontSize: 20 }}>Independent tracker</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
