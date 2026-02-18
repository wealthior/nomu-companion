# Nomu Staking Companion

Unofficial, open-source community tool for **$NOMU Invisible Staking** on Solana.

Track your Value Score, simulate sell scenarios, and join the community leaderboard — all read-only, no custody, no trades.

## Features

- **Wallet Connect + Address Input** — Connect via Phantom/Solflare or paste any wallet address
- **Value Score Simulation** — Unofficial estimate based on public docs, with configurable parameters
- **What-If Simulator** — Drag a slider to see how selling X% could affect your score and weight
- **Community Leaderboard** — Opt in by signing a message, share your profile with a generated OG image
- **OG NFT Recognition** — Holders of Nomu OG NFTs get a badge on their profile and leaderboard
- **Season Tracking** — Current season progress, buy/sell event history with confidence indicators

> **Disclaimer**: This is an unofficial simulation. Actual Nomu protocol formulas may differ. Not financial advice.

## Quick Start (5 minutes)

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (or npm/yarn)

### 1. Clone and install

```bash
git clone https://github.com/your-username/nomu-staking-companion.git
cd nomu-staking-companion
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|---|---|---|
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint (public or your own) |
| `HELIUS_API_KEY` | No | Enables enriched tx parsing + OG NFT detection |
| `DATABASE_URL` | Yes | `file:./dev.db` for SQLite, `postgres://...` for production |
| `CRON_SECRET` | Yes | Secret for the leaderboard refresh endpoint |
| `NEXT_PUBLIC_BASE_URL` | Yes | Base URL for OG image generation |

### 3. Initialize the database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests |
| `pnpm ci` | Run lint + typecheck + tests |
| `pnpm db:studio` | Open Prisma Studio |

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── wallet/[address]  # Wallet profile endpoint
│   │   ├── simulate/         # What-if simulation
│   │   ├── leaderboard/      # Leaderboard data
│   │   ├── opt-in/           # Leaderboard opt-in (signature verification)
│   │   ├── refresh/          # Cron endpoint for daily refresh
│   │   └── og/               # OG image generation
│   ├── app/                # Dashboard page
│   ├── leaderboard/        # Leaderboard page
│   ├── u/[wallet]/         # Public profile page
│   ├── disclaimer/         # Disclaimer page
│   └── privacy/            # Privacy statement
├── components/             # React components
│   ├── dashboard/          # Dashboard-specific components
│   ├── wallet/             # Wallet connect + address input
│   └── ui/                 # Shared UI (navbar)
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic
│   ├── simulation/         # Value Score simulation engine
│   ├── solana/             # Data adapters (RPC + Helius)
│   ├── services/           # Orchestration layer
│   ├── cache.ts            # In-memory TTL cache
│   ├── rate-limit.ts       # API rate limiting
│   ├── db.ts               # Prisma client singleton
│   ├── constants.ts        # Configuration constants
│   └── types.ts            # TypeScript type definitions
└── styles/                 # Global CSS
```

## Simulation Engine

The simulation runs per-season (1 UTC calendar month):

| Event | Formula |
|---|---|
| **Buy** | `score = score + (100 - score) * buyAlpha` (default α = 0.03) |
| **Sell** | `score = score * (1 - soldPct * sellBeta)` (default β = 1.5) |
| **Anti-Dump** | If >60% sold in 24h window → score = 0, disqualified |
| **DCA Bonus** | 3+ spaced buys → 1.05x, 6+ → 1.10x, 10+ → 1.20x |
| **Weight** | `finalScore * finalBalance` |

All parameters are configurable in `src/lib/constants.ts`.

## Data Adapters

| Adapter | When used | Capabilities |
|---|---|---|
| **Solana RPC** | Always (default) | Balance, tx history with heuristic buy/sell detection |
| **Helius** | When `HELIUS_API_KEY` set | Enriched tx parsing (higher confidence), OG NFT detection |

## Leaderboard

1. User connects wallet
2. User signs: `"Nomu Staking Companion Opt In <timestamp> <nonce>"`
3. Server verifies ed25519 signature
4. Snapshot stored: wallet, balance, simulated score/weight, OG flag
5. Daily refresh via `POST /api/refresh?secret=<CRON_SECRET>`

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Set environment variables
4. For production, use Postgres (e.g., Neon, Supabase) instead of SQLite:
   - Change `provider` in `prisma/schema.prisma` to `"postgresql"`
   - Set `DATABASE_URL` to your Postgres connection string
5. Deploy

### Self-hosted

```bash
pnpm build
pnpm start
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, dark mode
- **Database**: Prisma + SQLite (dev) / Postgres (prod)
- **Blockchain**: Solana Web3.js, SPL Token
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare)
- **Testing**: Vitest
- **Linting**: ESLint (next/core-web-vitals)

## Next Improvements

Ideas for the Nomu team or community contributors:

- [ ] Real collection address for OG NFT detection (currently heuristic name matching)
- [ ] WebSocket subscription for live balance updates
- [ ] Historical season comparison charts
- [ ] Estimated reward calculator (requires total reward pool data)
- [ ] Mobile PWA support with notifications
- [ ] Integration with official Nomu APIs when available
- [ ] Multi-wallet portfolio view
- [ ] Export simulation data as CSV
- [ ] Internationalization (i18n)

## License

MIT

---

*Built with respect for the Nomu community. This is an unofficial tool — see [/disclaimer](/disclaimer) for details.*
