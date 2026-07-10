import { getTranslations } from "next-intl/server";

// Mini-courbe d'évolution du solde en SVG pur (pas de lib de chart à ce
// stade — la décision de librairie viendra avec l'écran Stats).
export async function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;

  const W = 100;
  const H = 32;
  const PAD = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p - min) / range) * (H - PAD * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const rising = points[points.length - 1] >= points[0];
  const stroke = rising ? "var(--profit)" : "var(--loss)";

  const t = await getTranslations("common");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={rising ? t("balanceEvolutionRising") : t("balanceEvolutionFalling")}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`}
        fill="url(#spark-fill)"
      />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
