import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nomu Staking Companion",
  description:
    "Unofficial simulation tool for $NOMU Invisible Staking. Track your Value Score, simulate scenarios, and join the community leaderboard.",
  openGraph: {
    title: "Nomu Staking Companion",
    description:
      "Unofficial simulation tool for $NOMU Invisible Staking",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-dark-bg text-dark-text antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
