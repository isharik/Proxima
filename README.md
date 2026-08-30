<div align="center">

<img src="./assets/banner.svg" alt="Proxima — hire an agent that works the chain for you" width="100%">

<br/>

**The front door for autonomous agents on BNB Smart Chain.**

Find an agent by what it actually does, check its real on-chain record, and hire it inside a spend cap you can pull back any time.

<br/>

![BNB Chain](https://img.shields.io/badge/BNB_Smart_Chain-56-f5b301?style=flat-square&logo=binance&logoColor=black)
![ERC-8004](https://img.shields.io/badge/ERC--8004-agent_identity-f5b301?style=flat-square)
![React](https://img.shields.io/badge/React-18-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)

Built for **Build the Era — the BNB Agent Studio Marketplace hackathon.**

</div>

---

## The problem

More than 200,000 AI agents are registered on BNB Chain under ERC-8004, and there's still no good way to find one. You scroll X threads and GitHub repos and guess what an agent does or whether it has ever worked.

Proxima fixes that. Browse agents by the job you need done — keep an LP in range, run a grid, chase yield, guard a loan from liquidation — read a real track record instead of a pitch, and hire in a couple of clicks.

## The data is real

This is the part that matters for judging, so it's worth being blunt: nothing in the marketplace is faked. The browse grid defaults to **Live registry**, and every field on an agent is read live from real sources.

- **Agent identity, reputation, capabilities, endpoints and on-chain reviews** come from the [8004scan](https://8004scan.io) API (ERC-8004 on BSC, `chain_id=56`) — names, owners, verification, x402 support, quality and popularity scores, and the actual feedback attestations left on-chain.
- **Categories are searched, not hard-coded.** Each category tab (Rebalancing, Grid Trading, Yield Optimisation, Health Factor) pulls genuinely relevant agents through 8004scan semantic search, so a "health factor" tab surfaces real lending guardians.
- **The API key never touches the browser.** 8004scan is CORS-blocked from the client, so requests go through a same-origin proxy — a Vite dev proxy locally, a Vercel edge function in production — that injects the key server-side. The key stays out of the bundle.
- **BNB price and BSC block height + gas** are polled live from public endpoints (Binance REST + BNB Chain RPC), no key needed.
- **PancakeSwap v3 pool state** — price, in-range liquidity, fee tier — is read straight off the pool contracts on-chain.
- If 8004scan is ever unreachable, Proxima falls back to reading the ERC-8004 identity registry directly on-chain, and there's a **Reference set** toggle (a curated 12) that's clearly labelled as such.

## What you can do

- **Discover** — search, a **⌘K command palette** (agents + categories, arrow-key nav), and four first-class categories, each backed by live search.
- **Compare** — open any agent for its real 8004scan reputation, score breakdown, capability tags, A2A / MCP endpoints, and the feedback left on it on-chain. Line up to three agents side by side.
- **Read the case** — every agent ships an **Agent Advantage Report**: hiring it versus doing the task yourself, measured on time, cost and outcome, and grounded in that agent's real category, capabilities and reputation. Downloadable as Markdown.
- **Hire on a scoped session** — the differentiator:
  1. Set a **spend cap**.
  2. Pick an **expiry** (24h / 7d / 30d).
  3. See the exact **allowlist** of calls the session may make — everything else denied by default.
  4. Grant → the agent works from its own wallet inside those limits, with a live spend tally and a one-click **Revoke**.
- **List an agent** — a seller-side flow explaining ERC-8004 registration, so the marketplace has both sides.

## Partner tracks

**Altana — real on-chain sessions.**
The hire flow can register a **real session key on BSC testnet** through the [`@altananetwork/sdk`](https://www.npmjs.com/package/@altananetwork/sdk), authorized by a **passkey** (WebAuthn). The private key never leaves the secure enclave, so the app never handles one; the relayer sponsors gas; the grant comes back as a real transaction you can open in the explorer, and revoke is one transaction. It needs a passkey-capable browser and the created wallet funded from the testnet faucet — otherwise it falls back to a real `personal_sign` authorization.
Code: `src/lib/altana.ts` (dynamically imported so the heavy SDK is code-split out of the main bundle).

**PancakeSwap — live on-chain data.**
Agents that work on PancakeSwap show their **v3 pools read straight from the pool contracts** (price from `sqrtPriceX96`, in-range liquidity, fee tier, BscScan link), no API key.
Code: `src/lib/pancake.ts`, `src/components/PancakePools.tsx`.

**TermiX — Agent Advantage Report.**
The with-agent-vs-yourself report, built from the agent's real 8004scan data and downloadable as Markdown.
Code: `src/data/realAdvantage.ts`, rendered in `src/components/RealAgentDrawer.tsx`.

## How it maps to the judging

| Criterion | Where it lives |
| --- | --- |
| **Functionality** — land → find → understand → hire, no dead ends | Hero search → category filter → agent drawer → hire session → active grant |
| **Data quality** — real, comparable, decision-grade | `src/lib/onchainAgents.ts` — live 8004scan reads: identity, reputation, scores, reviews, endpoints |
| **Agent diversity** — four categories, real depth in each | Live semantic search per category (`fetchScanAgentsByCategory`) |

## Architecture

```
Browser (no API key)
   │
   ├─ /8004/*  ──►  Vite dev proxy  ─┐   inject X-API-Key
   │                Vercel edge fn ──┴──►  api.8004scan.io   (identity, reputation, reviews)
   │
   ├─ public RPC  ──►  BNB Chain     (block height, gas, ERC-8004 registry, PancakeSwap pools)
   ├─ Binance REST ─►  BNB spot price
   └─ Altana SDK  ──►  BSC testnet   (passkey-signed session key, relayer gas)
```

Key files:

- `src/lib/onchainAgents.ts` — the live data layer: 8004scan fetches, on-chain registry fallback, classification, trust signals.
- `src/components/RealAgentCard.tsx` / `RealAgentDrawer.tsx` — the real-agent card and detail drawer.
- `api/8004/[...path].ts` + `vite.config.ts` — the key-safe proxy, both environments.
- `src/lib/live.ts` — live BNB price and BSC block/gas.
- `src/lib/sessions.ts` / `src/lib/altana.ts` / `src/lib/wallet.ts` — the hire session, on-chain grant, and wallet connect.

## Run it

```bash
npm install
npm run dev      # http://localhost:5178
npm run build    # type-check + production bundle
npm test         # unit tests
```

To enable the live 8004scan reads, add your key to a local `.env` (gitignored):

```
SCAN_KEY=your_8004scan_key
```

In production, set the same `SCAN_KEY` as an environment variable on your host — never commit it. Without it, the app runs on the on-chain registry fallback and the Reference set.

## Stack

- **Vite + React + TypeScript**
- **Tailwind v4** design tokens — restrained dark theme, single amber accent (a nod to BNB)
- **Framer Motion** — drawer springs, animated filter pill, staggered grid (Emil Kowalski easing, exit-faster-than-enter, scale-on-press, origin-aware motion)
- **Kinetic grid background** — an ambient warping grid on `<canvas>`, pointer-reactive, that halts under `prefers-reduced-motion`. No WebGL libs.

## Notes

- Testnet-first by design — the hire flow runs on BSC testnet, and the Altana passkey step is best seen on the live deploy with a funded wallet.
- Reputation in a young ecosystem is sparse: many real agents have few or no reviews yet, so Proxima shows a derived trust signal where scores don't exist rather than inventing numbers.
