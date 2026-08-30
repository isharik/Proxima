# Proxima

**The front door for autonomous agents on BNB Smart Chain.**

200,000+ agents are registered on BSC under ERC-8004, but there is no good way to
find one. Proxima is the venue: browse agents by what they actually do, compare
real on-chain track records, and hire one — inside a spend cap you set and can
revoke at any time.

Built for **Build the Era — the BNB Agent Studio Marketplace hackathon**.

---

## The idea in one line

You don't hire an agent by digging through X threads and GitHub repos. You come
to Proxima, filter by the job you need done, read a real performance record
instead of a marketing pitch, and grant the agent a scoped session on its own
wallet. It works for you inside your limits — and only those.

## Data: what's live vs. representative

Honesty matters for judging, so this is explicit and labelled in-product:

- **Genuinely live (no API key):** BNB spot price + 24h change (Binance public
  REST) and BSC block height + gas price (BNB Chain public RPC), polled every
  15s in the network rail. This is what makes "Live on BSC" true, and the hire
  flow reads live gas.
- **Representative:** per-agent performance records for the four reference
  categories. There is no free source for these without an approved 8004scan Pro
  key, so they are seed data — and the UI carries a **"Demo data"** badge that
  says so, with a tooltip explaining the swap. `src/lib/agentsSource.ts` already
  performs a real fetch when `VITE_8004SCAN_KEY` is set; drop in a key and the
  same components render live records, no changes.

## What's built

- **Discovery** — search, a **⌘K command palette** (agents + categories, arrow
  keys), and four first-class categories (Rebalancing, Grid Trading, Yield
  Optimisation, Health Factor), each with equal depth, filtered and sorted.
- **Live network rail** — real BNB price, BSC block height and gas, polling.
- **Seller side** — a "List your agent" flow explaining ERC-8004 registration
  with a builder waitlist, so the marketplace has both sides.
- **Real states** — loading skeletons, empty state, graceful live-data
  reconnect, and an honest data-source badge.
- **Data quality** — every agent carries an ERC-8004-shaped identity, a
  reputation score derived from on-chain feedback signals, a hire/review count,
  and category-appropriate performance metrics (time-in-range, win rate, net
  APR, liquidations avoided, reaction time…) plus a track-record sparkline.
- **The hire flow (the differentiator)** — a scoped-session grant modelled on
  Altana self-custodial sessions:
  1. Set a **spend cap** (test USDC only).
  2. Pick an **expiry** (24h / 7d / 30d).
  3. See the exact **allowlist** of calls the session may make — everything else
     denied by default, registered on-chain in Keystore.
  4. Grant → the agent gets its own wallet, an active session with a session
     key, and a one-click **Revoke**.

## Partner tracks

- **Altana (real on-chain sessions).** The hire flow can register a **real
  session key on BSC testnet** via the `@altananetwork/sdk` — authorized by a
  **passkey** (WebAuthn; the private key never leaves the secure enclave, so the
  app never handles a key), with gas sponsored by the Altana relayer. The result
  carries a real transaction hash linked to the explorer, the spend cap + expiry
  are enforced on-chain, and revoke is one transaction. Pick "Register on-chain"
  in the hire dialog. Needs a passkey-capable browser + the created wallet funded
  from the testnet faucet. Falls back to a real `personal_sign` authorization
  otherwise. Code: `src/lib/altana.ts` (dynamically imported — the heavy SDK is
  code-split out of the main bundle).
- **PancakeSwap (live on-chain data).** Agents that work on PancakeSwap show
  their **live v3 pools read straight from the pool contracts** on BNB Chain
  (price from `sqrtPriceX96`, in-range liquidity, fee tier, BscScan link) — no
  API key. Code: `src/lib/pancake.ts`, `src/components/PancakePools.tsx`.
- **TermiX (Agent Advantage Report).** Every agent has a with-agent-vs-yourself
  report across three tasks (time / cost / outcome, one from trading/security),
  **downloadable as Markdown**. Code: `src/data/advantage.ts`,
  `src/components/AdvantageReport.tsx`.

## How it maps to the judging

| Criterion (main track) | Where it lives |
| --- | --- |
| **Functionality** — land → find → understand → hire, no dead ends | Hero search → category filter → agent card → hire drawer → active session |
| **Data quality** — real, comparable, decision-grade | `src/data/agents.ts` — ERC-8004-shaped records, reputation, per-category metrics, sparklines |
| **Agent diversity** — all four categories, equal depth | 3 agents per category, each with category-specific metrics and allowlists |

**Altana partner track** — the hire flow *is* the Altana story: agents on their
own wallets, sessions with a call allowlist + spend cap + expiry, user-facing
revoke. The data seam (`src/data/agents.ts`) and the session config
(`HireDrawer.tsx`) are where the live Altana SDK + 8004scan Pro API drop in.

## Run it

```bash
npm install
npm run dev      # http://localhost:5178
npm run build    # type-check + production bundle
```

## Stack

- **Vite + React + TypeScript**
- **Tailwind v4** design tokens — restrained premium dark, single amber accent
- **Framer Motion** — drawer springs, animated filter pill, staggered grid,
  layout transitions (Emil Kowalski easing curves, exit-faster-than-enter,
  scale-on-press, origin-aware motion)
- **Minimal 3D background** — a projected Fibonacci point cloud on `<canvas>`,
  pointer-parallaxed, halts under `prefers-reduced-motion`. No WebGL libs.

## Where the real integrations plug in

- **8004scan Pro API** → replace the array in `src/data/agents.ts`. The `Agent`
  type already mirrors the identity / reputation / activity fields the API
  exposes, so it's a fetch swap, not a refactor.
- **Altana SDK / Keystore** → `HireDrawer.tsx` `grant()` is the single call site;
  swap the simulated session key for a real session registration + on-chain tx.
- **x402** → the per-session price is already surfaced; wire it as the payment
  facilitator at grant time.

## Notes

- Testnet-first by design — every value in the flow is test USDC / BSC testnet.
- Metrics in this build are representative placeholders for the four reference
  categories; the type and the UI are production-shaped so live data renders
  without UI changes.
