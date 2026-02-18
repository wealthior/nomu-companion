"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletConnect() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const short = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-mono text-dark-muted">
          {short}
        </span>
        <button onClick={disconnect} className="btn-secondary text-xs">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="btn-primary text-xs"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
