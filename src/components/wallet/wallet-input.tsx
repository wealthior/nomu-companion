"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isValidSolanaAddress } from "@/lib/solana/validation";

interface WalletInputProps {
  placeholder?: string;
  buttonLabel?: string;
  onSubmit?: (wallet: string) => void;
  navigateTo?: "dashboard" | "profile";
}

export function WalletInput({
  placeholder = "Enter a Solana wallet address...",
  buttonLabel = "View Dashboard",
  onSubmit,
  navigateTo = "dashboard",
}: WalletInputProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Please enter a wallet address");
      return;
    }
    if (!isValidSolanaAddress(trimmed)) {
      setError("Invalid Solana wallet address");
      return;
    }
    setError("");
    if (onSubmit) {
      onSubmit(trimmed);
    } else if (navigateTo === "dashboard") {
      router.push(`/app?wallet=${trimmed}`);
    } else {
      router.push(`/u/${trimmed}`);
    }
  }, [address, onSubmit, navigateTo, router]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-dark-border bg-dark-card px-4 py-2.5 text-sm font-mono text-dark-text placeholder:text-dark-muted focus:border-nomu-500/50 focus:outline-none focus:ring-1 focus:ring-nomu-500/50 transition-colors"
          spellCheck={false}
          autoComplete="off"
        />
        <button onClick={handleSubmit} className="btn-primary whitespace-nowrap">
          {buttonLabel}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
