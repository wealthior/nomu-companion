"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { OPT_IN_MESSAGE_PREFIX } from "@/lib/constants";
import bs58 from "bs58";

interface OptInButtonProps {
  isOptedIn: boolean;
  onOptIn: () => void;
}

export function OptInButton({ isOptedIn, onOptIn }: OptInButtonProps) {
  const { publicKey, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOptIn = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    setLoading(true);
    setError("");

    try {
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).slice(2, 10);
      const message = `${OPT_IN_MESSAGE_PREFIX} ${timestamp} ${nonce}`;
      const messageBytes = new TextEncoder().encode(message);

      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      const res = await fetch("/api/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          signature: signatureBase58,
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Opt-in failed");
      }

      onOptIn();
    } catch (err) {
      if (err instanceof Error && err.message.includes("User rejected")) {
        setError("Signature request was cancelled");
      } else {
        setError(err instanceof Error ? err.message : "Opt-in failed");
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage, onOptIn]);

  if (!publicKey) return null;

  if (isOptedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-nomu-400" />
        <span className="text-xs text-dark-muted">On the Leaderboard</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleOptIn}
        disabled={loading || !signMessage}
        className="btn-secondary text-xs"
      >
        {loading ? "Signing..." : "Join Leaderboard"}
      </button>
      {!signMessage && (
        <p className="mt-1 text-xs text-dark-muted">
          Wallet does not support message signing
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
