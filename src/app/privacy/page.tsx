import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Privacy Statement</h1>

        <div className="space-y-6 text-sm text-dark-muted leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              What We Collect
            </h2>
            <p>
              This application collects <strong className="text-dark-text">only public wallet addresses</strong>.
              No email addresses, names, IP addresses, or personal identifiers are stored.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Leaderboard Data
            </h2>
            <p>
              If you opt in to the leaderboard, we store your public wallet address, a hash
              of your signature (for verification), and your simulated score/weight snapshot.
              All of this data is derived from publicly visible on-chain information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              No Cookies
            </h2>
            <p>
              We do not use tracking cookies, analytics services, or any form of user tracking.
              Telemetry is off by default and no third-party analytics are included.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              On-Chain Data
            </h2>
            <p>
              Transaction data is fetched from the Solana blockchain through public RPC
              endpoints or Helius API. This data is publicly available and is cached
              temporarily for performance purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              No Private Keys
            </h2>
            <p>
              We never request, store, or have access to your private keys or seed phrases.
              The wallet connection is used exclusively for reading your public address.
              Message signing is used only for leaderboard opt-in verification.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Data Deletion
            </h2>
            <p>
              To remove your data from the leaderboard, contact the maintainer through
              the project&apos;s GitHub repository. Since only your public wallet address is
              stored, removal is straightforward.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/" className="btn-primary text-xs">
            Back to Home
          </Link>
          <Link href="/disclaimer" className="btn-secondary text-xs">
            Disclaimer
          </Link>
        </div>
      </main>
    </>
  );
}
