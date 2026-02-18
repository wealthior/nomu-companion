import { Navbar } from "@/components/ui/navbar";
import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Disclaimer</h1>

        <div className="space-y-6 text-sm text-dark-muted leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Unofficial Community Tool
            </h2>
            <p>
              Nomu Staking Companion is an <strong className="text-dark-text">unofficial, open-source community tool</strong>.
              It is not affiliated with, endorsed by, or officially connected to the Nomu team
              or any related entity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Simulation Only
            </h2>
            <p>
              All Value Score calculations, weight estimates, and projections shown in this
              application are <strong className="text-dark-text">unofficial simulations</strong> based on
              publicly available documentation. The exact formulas used by the Nomu protocol
              may differ from our implementation. Actual rewards may vary significantly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Not Financial Advice
            </h2>
            <p>
              Nothing in this application constitutes financial advice, investment advice,
              trading advice, or any other kind of advice. You should not treat any of the
              application&apos;s content as such. Do your own research before making any
              financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Read-Only, No Custody
            </h2>
            <p>
              This application is strictly read-only. It does not execute any trades,
              transfers, or transactions. It does not custody, store, or have access to
              your private keys. Wallet connection is used solely for reading your public
              address and requesting message signatures for opt-in purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Data Accuracy
            </h2>
            <p>
              While we strive for accuracy, on-chain data parsing may contain errors.
              Transaction classification (buy/sell) uses heuristics that may not be 100%
              accurate. We display confidence indicators where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              No Warranty
            </h2>
            <p>
              This software is provided &quot;as is&quot;, without warranty of any kind, express or
              implied. The authors are not liable for any damages arising from the use of
              this application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-dark-text mb-2">
              Open Source
            </h2>
            <p>
              This project is open source. You are welcome to review the code, suggest
              improvements, or fork it for your own use.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/" className="btn-primary text-xs">
            Back to Home
          </Link>
          <Link href="/privacy" className="btn-secondary text-xs">
            Privacy Statement
          </Link>
        </div>
      </main>
    </>
  );
}
