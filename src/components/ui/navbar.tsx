"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "@/components/wallet/wallet-connect";

const navLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-border/50 bg-dark-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nomu-500 to-nomu-600 shadow-nomu transition-all duration-300 group-hover:shadow-nomu-lg group-hover:scale-105">
              <span className="text-base">🐠</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight gradient-text-orange">
                NOMU
              </span>
              <span className="text-sm font-medium text-dark-muted ml-1">
                Companion
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? "bg-nomu-500/10 text-nomu-400 border border-nomu-500/20"
                    : "text-dark-muted hover:text-dark-text hover:bg-dark-surface/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <WalletConnect />
      </div>
    </nav>
  );
}
