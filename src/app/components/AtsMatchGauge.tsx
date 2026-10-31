export type MatchBand = "strong" | "good" | "fair" | "weak";

export interface AtsMatchGaugeProps {
  /** 0–100 match score. Values outside the range are clamped. */
  score: number;
  /** Rendered width in px (height is half). */
  size?: number;
  /** Caption under the arc. */
  label?: string;
  /** Optional secondary detail, e.g. "12/15 critical keywords". */
  sublabel?: string;
  className?: string;
}

/** Clamp/round any numeric score into the 0–100 range. Pure — unit tested. */
export function clampScore(score: number): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Map a 0–100 score onto a qualitative band. Pure — unit tested. */
export function getMatchBand(score: number): MatchBand {
  const s = clampScore(score);
  if (s >= 85) return "strong";
  if (s >= 70) return "good";
  if (s >= 50) return "fair";
  return "weak";
}

const BAND_META: Record<
  MatchBand,
  { stroke: string; text: string; caption: string }
> = {
  strong: {
    stroke: "#059669",
    text: "text-emerald-600 dark:text-emerald-400",
    caption: "Strong match",
  },
  good: {
    stroke: "#0d9488",
    text: "text-teal-600 dark:text-teal-400",
    caption: "Good match",
  },
  fair: {
    stroke: "#d97706",
    text: "text-amber-600 dark:text-amber-400",
    caption: "Fair match",
  },
  weak: {
    stroke: "#dc2626",
    text: "text-red-600 dark:text-red-400",
    caption: "Needs work",
  },
};

/** Band → colour/label metadata. Pure — unit tested. */
export function getBandMeta(band: MatchBand) {
  return BAND_META[band];
}

/**
 * Instant ATS Keyword Match gauge — a dependency-free SVG semicircle.
 *
 * Renders the 0–100 match score as a filled arc plus a banded caption, so the
 * number reads at a glance (green ≥85, teal ≥70, amber ≥50, red below).
 */
export default function AtsMatchGauge({
  score,
  size = 160,
  label = "ATS Keyword Match",
  sublabel,
  className = "",
}: AtsMatchGaugeProps) {
  const value = clampScore(score);
  const meta = BAND_META[getMatchBand(value)];

  const strokeWidth = Math.max(8, Math.round(size * 0.09));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const height = size / 2 + strokeWidth;
  const arcLen = Math.PI * r;
  const dash = (arcLen * value) / 100;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      role="img"
      aria-label={`${label}: ${value} percent, ${meta.caption}`}
    >
      <svg
        width={size}
        height={height}
        viewBox={`0 0 ${size} ${height}`}
        className="overflow-visible"
        aria-hidden
      >
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={meta.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLen}`}
        />
        <text
          x={cx}
          y={cy - strokeWidth / 2}
          textAnchor="middle"
          className={`fill-current ${meta.text}`}
          style={{ fontSize: size * 0.26, fontWeight: 700 }}
        >
          {value}%
        </text>
      </svg>
      <p className="mt-1 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </p>
      <p className={`text-xs font-semibold ${meta.text}`}>
        {meta.caption}
        {sublabel ? ` · ${sublabel}` : ""}
      </p>
    </div>
  );
}
