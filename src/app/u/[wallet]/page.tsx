import type { Metadata } from "next";
import { isValidSolanaAddress } from "@/lib/solana/validation";
import { ProfileClient } from "./profile-client";

interface ProfilePageProps {
  params: Promise<{ wallet: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { wallet } = await params;
  const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  return {
    title: `${shortWallet} — Nomu Staking Companion`,
    description: `View $NOMU staking simulation for ${shortWallet}`,
    openGraph: {
      title: `${shortWallet} — Nomu Staking Companion`,
      description: `View $NOMU staking simulation for ${shortWallet}`,
      images: [
        {
          url: `${baseUrl}/api/og?wallet=${wallet}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${shortWallet} — Nomu Staking Companion`,
      images: [`${baseUrl}/api/og?wallet=${wallet}`],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { wallet } = await params;

  if (!isValidSolanaAddress(wallet)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold mb-2">Invalid Wallet</h1>
          <p className="text-sm text-dark-muted">
            The provided wallet address is not valid.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileClient wallet={wallet} />;
}
