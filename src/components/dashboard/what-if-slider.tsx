"use client";

import { useState } from "react";
import type { SimulationResult } from "@/lib/types";

interface WhatIfSliderProps {
  currentSimulation: SimulationResult;
  whatIfResult: SimulationResult | null;
  onSimulate: (sellPercent: number) => void;
}

export function WhatIfSlider({
  currentSimulation,
  whatIfResult,
  onSimulate,
}: WhatIfSliderProps) {
  const [sellPercent, setSellPercent] = useState(0);

  /**
   * Call onSimulate immediately on every slider change.
   * No debounce needed — simulation runs locally and is instant.
   */
  const handleChange = (value: number) => {
    setSellPercent(value);
    onSimulate(value);
  };

  const display = sellPercent > 0 && whatIfResult ? whatIfResult : currentSimulation;
  const scoreChange = sellPercent > 0 && whatIfResult
    ? whatIfResult.finalScore - currentSimulation.finalScore
    : 0;
  const weightChange = sellPercent > 0 && whatIfResult
    ? whatIfResult.weight - currentSimulation.weight
    : 0;

  // Danger zone coloring
  const isDanger = sellPercent > 60;

  return (
    <div className="card relative overflow-hidden space-y-4">
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-colors duration-300"
        style={{
          background: isDanger
            ? "linear-gradient(to right, transparent, rgba(239, 68, 68, 0.5), transparent)"
            : "linear-gradient(to right, transparent, rgba(6, 163, 240, 0.3), transparent)",
        }}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span>🎣</span>
          What-If Simulation
        </h3>
        <span className={sellPercent > 60 ? "badge-sell" : "badge-score"}>
          Selling {sellPercent}%
        </span>
      </div>

      <p className="text-xs text-dark-muted">
        Drag the slider to see how selling would affect your score. Over 60% triggers disqualification.
      </p>

      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={sellPercent}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full h-2 bg-dark-surface rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${
                isDanger ? "#ef4444" : "#06a3f0"
              } 0%, ${
                isDanger ? "#ef4444" : sellPercent > 40 ? "#f97316" : "#06a3f0"
              } ${sellPercent}%, rgba(26, 39, 68, 0.5) ${sellPercent}%, rgba(26, 39, 68, 0.5) 100%)`,
            }}
          />
          {/* Danger zone marker at 60% */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-red-500/40"
            style={{ left: "60%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-dark-muted font-mono">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span className="text-red-400/50">60%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {sellPercent > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl bg-dark-surface/50 border border-dark-border/50 p-3 text-center">
            <p className="stat-label">New Score</p>
            <p className={`mt-1 text-lg font-bold ${display.finalScore < 20 ? "text-red-400" : "text-ocean-400"}`}>
              {display.finalScore.toFixed(1)}
            </p>
            {scoreChange !== 0 && (
              <p className={`text-xs font-semibold ${scoreChange < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {scoreChange > 0 ? "+" : ""}{scoreChange.toFixed(1)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-dark-surface/50 border border-dark-border/50 p-3 text-center">
            <p className="stat-label">New Balance</p>
            <p className="mt-1 text-lg font-bold text-dark-text">
              {display.finalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl bg-dark-surface/50 border border-dark-border/50 p-3 text-center">
            <p className="stat-label">New Weight</p>
            <p className="mt-1 text-lg font-bold text-dark-text">
              {display.weight.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            {weightChange !== 0 && (
              <p className={`text-xs font-semibold ${weightChange < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {weightChange > 0 ? "+" : ""}{weightChange.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
        </div>
      )}

      {display.disqualified && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-400">
              Anti-Dump Rule Triggered!
            </p>
            <p className="text-xs text-red-400/70 mt-1">
              Selling this much disqualifies you for the season. Score drops to 0. Don&apos;t do it fren.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
