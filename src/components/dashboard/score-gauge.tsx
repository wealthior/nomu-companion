"use client";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Animated radial gauge showing the Value Score.
 * Uses orange-to-blue gradient matching the Nomu brand.
 */
export function ScoreGauge({ score, label = "Value Score", size = "md" }: ScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const dimensions = {
    sm: { width: 80, fontSize: "text-lg", glowSize: "10px" },
    md: { width: 120, fontSize: "text-2xl", glowSize: "15px" },
    lg: { width: 180, fontSize: "text-5xl", glowSize: "25px" },
  }[size];

  // Orange → Yellow → Cyan gradient based on score
  const getColor = (s: number) => {
    if (s >= 80) return "#fb923c"; // High = orange (reward!)
    if (s >= 60) return "#fdba74"; // Good = light orange
    if (s >= 40) return "#36bfff"; // Medium = ocean blue
    if (s >= 20) return "#0082cd"; // Low = deeper blue
    return "#ef4444"; // Danger = red
  };

  const color = getColor(clamped);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{
          width: dimensions.width,
          height: dimensions.width,
          filter: `drop-shadow(0 0 ${dimensions.glowSize} ${color}40)`,
        }}
      >
        <svg
          className="rotate-[-90deg]"
          width={dimensions.width}
          height={dimensions.width}
          viewBox="0 0 100 100"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(26, 39, 68, 0.5)"
            strokeWidth="6"
          />
          {/* Subtle tick marks at 25%, 50%, 75% */}
          {[25, 50, 75].map((pct) => {
            const angle = (pct / 100) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 45 * Math.cos(rad);
            const y = 50 + 45 * Math.sin(rad);
            return (
              <circle
                key={pct}
                cx={x}
                cy={y}
                r="1.5"
                fill="rgba(107, 127, 163, 0.3)"
              />
            );
          })}
          {/* Score arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold ${dimensions.fontSize}`}
            style={{ color }}
          >
            {clamped.toFixed(1)}
          </span>
          {size === "lg" && (
            <span className="text-[10px] text-dark-muted mt-0.5">/ 100</span>
          )}
        </div>
      </div>
      <p className="stat-label">{label}</p>
    </div>
  );
}
