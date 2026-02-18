"use client";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  accent?: boolean;
  warning?: boolean;
  icon?: string;
}

/**
 * Stat card with ocean-themed glass effect and subtle glow on accent.
 */
export function StatCard({ label, value, subValue, accent, warning, icon }: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-1px] ${
        warning
          ? "border-red-500/20 bg-red-500/5"
          : accent
            ? "border-nomu-500/20 bg-dark-card shadow-nomu"
            : "border-dark-border bg-dark-card"
      }`}
      style={{
        backgroundImage: accent
          ? "linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(6, 163, 240, 0.03) 100%)"
          : undefined,
      }}
    >
      {/* Subtle top border glow for accent */}
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-nomu-500/50 to-transparent" />
      )}

      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <p
        className={`stat-value mt-2 ${
          warning
            ? "text-red-400"
            : accent
              ? "gradient-text-orange"
              : "text-dark-text"
        }`}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-1.5 text-[11px] text-dark-muted">{subValue}</p>
      )}
    </div>
  );
}
