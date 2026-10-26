# Spectra

**AI agent monitoring and anomaly detection for Solana.**

> "x402 processed 100M+ payments in 6 months. AI agents are now spending real money autonomously. But there's no oversight layer—no one knows when an agent goes rogue until it's too late."

Spectra is a monitoring dashboard for autonomous trading agents on Solana. It streams agent trades into a live dashboard, classifies each trade's behaviour, flags anomalies, sends Discord alerts and can trip a kill switch that pauses agents.

Built for **UOttaHack 8**, competing for **Best Use of Solana**.

---

## Features

What's implemented in this repository:

- **Live dashboard** (`/dashboard`): a feed of trades for three agents (Alpha, Beta, Gamma), read from Supabase with realtime subscriptions on the `trades` and `agents` tables.
- **Behaviour classification**: trades are scored and labelled `conservative`, `aggressive`, `anomalous` or `rogue`. Agents with no recent activity are marked `dormant`.
- **Anomaly alerts**: anomalous or rogue trades are posted to a Discord webhook through `POST /api/alerts`.
- **Kill switch**: an armed kill switch disables agents automatically when an anomaly is detected.
- **Per-agent configuration**: strategy, minimum confidence, risk tolerance, max position (USD) and preferred tokens, stored on the `agents` table.
- **Solana wallet monitoring**: `@solana/web3.js` WebSocket subscriptions watch a wallet, parse new transactions (transfer / swap / x402 payment / unknown) and insert them into `trades`. See [`spectra/lib/solana/README.md`](spectra/lib/solana/README.md).
- **Auth**: Supabase email auth (login, signup, callback and confirm routes).
- **Marketing and docs site**: landing, pricing, SDK, API, waitlist and support pages, plus a Fumadocs documentation site at `/docs` with search and generated OG images.
- **Terminal UI** ([`spectra-tui/`](spectra-tui/)): a Textual app that polls `GET /api/dashboard` and shows agent stats, trades and API logs in the terminal.

A one-minute demo video ships with the app at `spectra/public/1 Min DEMO VIDEO.mp4` and plays on the landing page.

---

## Tech Stack

- **Web app:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui-style components (Base UI / Radix), GSAP, Motion, three.js / ogl visuals
- **Docs:** Fumadocs (`fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx`)
- **Data and auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Blockchain:** Solana via `@solana/web3.js` (devnet by default)
- **Alerts:** Discord webhooks
- **TUI:** Python 3.10+, Textual, Rich, httpx

---

## Project Structure

```
.
├── README.md
├── docs/                  # Original hackathon planning docs (market, architecture, MVP, pitch)
├── spectra/               # Next.js web app
│   ├── app/               # Routes: pages, API routes (/api/*), auth callbacks, docs, OG images
│   ├── components/        # UI and visual components (ui/ = shadcn-style primitives, docs/ = MDX doc components)
│   ├── content/docs/      # MDX content for the /docs site
│   ├── lib/               # Supabase clients, auth hook, Solana integration, Fumadocs source
│   ├── public/            # Static assets (images, demo video)
│   └── references/        # Design reference screenshots
└── spectra-tui/           # Python terminal dashboard (Textual)
```

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/dashboard` | GET | Recent trades from Supabase plus per-agent stats and a summary (used by the TUI) |
| `/api/alerts` | POST | Forwards an alert payload to the Discord webhook |
| `/api/solana/monitor` | POST / GET | Start/stop monitoring a wallet for an agent; list active monitors |
| `/api/solana/transaction` | GET | Look up a transaction by `signature`, or recent transactions for a `wallet` |
| `/api/search` | GET | Fumadocs search over `/docs` content |

---

## Prerequisites

- Node.js 20+ and npm
- A Supabase project with `trades` and `agents` tables (the app reads and writes these)
- Python 3.10+ (only for the TUI)

---

## Setup & Run

### Web app

```bash
cd spectra
npm install          # also runs `fumadocs-mdx` (postinstall) to generate .source/
# create spectra/.env.local with the variables below
npm run dev          # http://localhost:3000
```

The repo also has a `pnpm-lock.yaml`, so `pnpm install` / `pnpm dev` work as well.

### Terminal UI

With the web app running:

```bash
cd spectra-tui
pip install -e .
spectra              # or: python -m spectra_tui.main
```

See [`spectra-tui/README.md`](spectra-tui/README.md) for TUI options and key bindings.

---

## Environment Variables

Put web app variables in `spectra/.env.local` (all `.env*` files are gitignored).

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (needed at build time too) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | No | Solana RPC endpoint (falls back to `SOLANA_RPC_URL`, then `https://api.devnet.solana.com`) |
| `SOLANA_RPC_URL` | No | Server-side fallback for the Solana RPC endpoint |
| `DISCORD_WEBHOOK_URL` | For alerts | Discord webhook that `/api/alerts` posts to (the route returns 500 if unset) |

For the Supabase MCP server used by editor tooling, copy `.mcp.example.json` to `.mcp.json` (gitignored) and set `SUPABASE_ACCESS_TOKEN` in your environment.

TUI variables (`SPECTRA_API_URL`, `SPECTRA_REFRESH_INTERVAL`, `SPECTRA_MAX_TRADES`, `SPECTRA_LOADING_DELAY`) are documented in [`spectra-tui/README.md`](spectra-tui/README.md).

---

## Scripts

Run from `spectra/`:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start the dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve the production build |
| `lint` | `eslint` | Lint the project |
| `postinstall` | `fumadocs-mdx` | Generate the Fumadocs content index (`.source/`) |

---

## Planning Docs

These are the team's original hackathon planning docs. They describe the intended product and roadmap, not necessarily what is implemented:

- [Market & GTM Strategy](docs/MARKET.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [MVP Scope](docs/MVP.md)
- [Pitch Deck Outline](docs/PITCH.md)

---

## Team

- Angus
- Kabith
- Rohan
- David
