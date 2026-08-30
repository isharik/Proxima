// ------------------------------------------------------------------
//  Proxima — agent dataset
//
//  Shape mirrors what an ERC-8004 identity + 8004scan reputation record
//  exposes, so this module is the single seam to swap for the live
//  8004scan Pro API (agent identity, capability, reputation, activity).
//  Metrics here are representative for the four reference categories.
// ------------------------------------------------------------------

export type Category =
  | 'rebalancing'
  | 'grid'
  | 'yield'
  | 'health'

export interface CategoryMeta {
  id: Category
  label: string
  short: string
  blurb: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'rebalancing',
    label: 'Rebalancing',
    short: 'LP ranges',
    blurb: 'Manages liquidity ranges and resets positions automatically.',
  },
  {
    id: 'grid',
    label: 'Grid Trading',
    short: 'Range strategies',
    blurb: 'Places and manages automated grid orders within a set range.',
  },
  {
    id: 'yield',
    label: 'Yield Optimisation',
    short: 'Best APR',
    blurb: 'Routes capital to the highest available yield across protocols.',
  },
  {
    id: 'health',
    label: 'Health Factor',
    short: 'Liquidation guard',
    blurb: 'Watches lending positions and acts before liquidation hits.',
  },
]

export interface Metric {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'neutral'
  hint?: string
}

export interface Agent {
  id: string
  /** ERC-8004 on-chain identity id */
  agentId: number
  name: string
  handle: string
  category: Category
  tagline: string
  description: string
  protocols: string[]
  /** 0–100, from 8004scan reputation signals */
  reputation: number
  /** distinct on-chain principals that have hired it */
  hires: number
  /** feedback attestations on-chain */
  reviews: number
  live: boolean
  verified: boolean
  /** price per session, in test USDC */
  pricePerSession: number
  /** headline stats shown on the card + detail */
  metrics: Metric[]
  /** window the track record covers */
  window: string
  /** sparkline points, newest last (relative performance index) */
  spark: number[]
  wallet: string
}

// deterministic-ish sparkline helper (kept inline so the dataset is self-contained)
function walk(seed: number, len = 24, drift = 0.4): number[] {
  let v = 50
  const out: number[] = []
  let s = seed
  for (let i = 0; i < len; i++) {
    s = (s * 9301 + 49297) % 233280
    const r = s / 233280
    v += (r - 0.5 + drift * 0.08) * 6
    v = Math.max(8, Math.min(96, v))
    out.push(Math.round(v))
  }
  return out
}

export const AGENTS: Agent[] = [
  // ---------------- Rebalancing ----------------
  {
    id: 'atlas-lp',
    agentId: 84213,
    name: 'Atlas Range',
    handle: 'atlas.range',
    category: 'rebalancing',
    tagline: 'Keeps concentrated liquidity in-range on PancakeSwap v3.',
    description:
      'Atlas watches your v3 position and re-centres the range when price drifts past a band you set. It batches resets to keep gas low and skips reset when the fee earned since last move would not cover it.',
    protocols: ['PancakeSwap v3', 'BNB Chain'],
    reputation: 94,
    hires: 1287,
    reviews: 412,
    live: true,
    verified: true,
    pricePerSession: 4,
    window: '90d, 3 pools',
    metrics: [
      { label: 'Time in range', value: '92.4%', tone: 'pos', hint: 'Share of blocks the LP stayed active' },
      { label: 'Fee APR captured', value: '31.7%', tone: 'pos' },
      { label: 'Avg resets / wk', value: '2.1', tone: 'neutral' },
      { label: 'Gas / reset', value: '0.9 gwei', tone: 'neutral' },
    ],
    spark: walk(11, 24, 0.6),
    wallet: '0x7A3f…C21b',
  },
  {
    id: 'meridian',
    agentId: 84588,
    name: 'Meridian',
    handle: 'meridian.lp',
    category: 'rebalancing',
    tagline: 'Volatility-aware range widths for wide-swinging pairs.',
    description:
      'Meridian sizes the range from realised volatility instead of a fixed percent, so it widens before big moves and tightens in calm markets. Best for BNB and mid-cap pairs.',
    protocols: ['PancakeSwap v3', 'Thena'],
    reputation: 88,
    hires: 643,
    reviews: 190,
    live: true,
    verified: true,
    pricePerSession: 5,
    window: '60d, 5 pools',
    metrics: [
      { label: 'Time in range', value: '87.9%', tone: 'pos' },
      { label: 'Fee APR captured', value: '28.3%', tone: 'pos' },
      { label: 'Impermanent loss', value: '−1.9%', tone: 'neg', hint: 'Net of fees over the window' },
      { label: 'Avg resets / wk', value: '3.4', tone: 'neutral' },
    ],
    spark: walk(29, 24, 0.35),
    wallet: '0x1De9…8AaF',
  },
  {
    id: 'keystone',
    agentId: 85102,
    name: 'Keystone',
    handle: 'keystone.range',
    category: 'rebalancing',
    tagline: 'Conservative stable-pair LP management.',
    description:
      'Keystone runs tight ranges on stable and correlated pairs, prioritising uptime over reach. Low resets, low drama.',
    protocols: ['PancakeSwap v3', 'Wombat'],
    reputation: 82,
    hires: 388,
    reviews: 96,
    live: true,
    verified: false,
    pricePerSession: 3,
    window: '120d, stable pairs',
    metrics: [
      { label: 'Time in range', value: '96.1%', tone: 'pos' },
      { label: 'Fee APR captured', value: '14.2%', tone: 'neutral' },
      { label: 'Avg resets / wk', value: '0.7', tone: 'pos' },
      { label: 'Max drawdown', value: '−0.4%', tone: 'pos' },
    ],
    spark: walk(7, 24, 0.5),
    wallet: '0x9Fb2…04C7',
  },

  // ---------------- Grid ----------------
  {
    id: 'lattice',
    agentId: 83990,
    name: 'Lattice',
    handle: 'lattice.grid',
    category: 'grid',
    tagline: 'Adaptive grid that re-spaces as volatility shifts.',
    description:
      'Lattice runs a classic buy-low/sell-high grid but re-spaces the rungs when volatility changes, so it does not sit idle in a quiet market or get run over in a fast one.',
    protocols: ['PancakeSwap', 'BNB Chain'],
    reputation: 91,
    hires: 2043,
    reviews: 654,
    live: true,
    verified: true,
    pricePerSession: 4,
    window: '90d, BNB/USDT',
    metrics: [
      { label: 'Win rate', value: '68.2%', tone: 'pos', hint: 'Closed grid trades in profit' },
      { label: 'Realised PnL', value: '+11.4%', tone: 'pos' },
      { label: 'Trades / day', value: '18', tone: 'neutral' },
      { label: 'Max drawdown', value: '−6.1%', tone: 'neg' },
    ],
    spark: walk(41, 24, 0.7),
    wallet: '0x5C1a…F2e0',
  },
  {
    id: 'tessera',
    agentId: 84760,
    name: 'Tessera',
    handle: 'tessera.grid',
    category: 'grid',
    tagline: 'Neutral grid for sideways ranges, auto-halts on breakout.',
    description:
      'Tessera is built for chop. It runs a symmetric grid and halts + alerts when price breaks the range instead of averaging into a trend.',
    protocols: ['PancakeSwap'],
    reputation: 85,
    hires: 911,
    reviews: 233,
    live: true,
    verified: true,
    pricePerSession: 3,
    window: '75d, 4 pairs',
    metrics: [
      { label: 'Win rate', value: '71.5%', tone: 'pos' },
      { label: 'Realised PnL', value: '+7.8%', tone: 'pos' },
      { label: 'Breakout halts', value: '9', tone: 'neutral', hint: 'Times it exited before a trend run' },
      { label: 'Trades / day', value: '24', tone: 'neutral' },
    ],
    spark: walk(53, 24, 0.45),
    wallet: '0x2Ba7…9dD1',
  },
  {
    id: 'quanta',
    agentId: 85340,
    name: 'Quanta',
    handle: 'quanta.grid',
    category: 'grid',
    tagline: 'High-frequency micro-grid for stable pairs.',
    description:
      'Quanta places a dense grid on low-volatility pairs and harvests the spread. Small edges, many times. Needs cheap gas to stay profitable — BNB Chain suits it.',
    protocols: ['PancakeSwap', 'BNB Chain'],
    reputation: 79,
    hires: 502,
    reviews: 121,
    live: true,
    verified: false,
    pricePerSession: 2,
    window: '45d, USDT/USDC',
    metrics: [
      { label: 'Win rate', value: '83.0%', tone: 'pos' },
      { label: 'Realised PnL', value: '+4.1%', tone: 'pos' },
      { label: 'Trades / day', value: '140', tone: 'neutral' },
      { label: 'Max drawdown', value: '−1.2%', tone: 'pos' },
    ],
    spark: walk(67, 24, 0.4),
    wallet: '0x8E44…37Ac',
  },

  // ---------------- Yield ----------------
  {
    id: 'harvester',
    agentId: 84055,
    name: 'Harvester',
    handle: 'harvester.yield',
    category: 'yield',
    tagline: 'Chases the best risk-adjusted APR across BNB lending markets.',
    description:
      'Harvester moves stablecoin liquidity between Venus, Aave v3 and Lista based on net APR after gas, and refuses markets whose risk score falls below a floor you set.',
    protocols: ['Venus', 'Aave v3', 'Lista'],
    reputation: 93,
    hires: 1560,
    reviews: 498,
    live: true,
    verified: true,
    pricePerSession: 4,
    window: '90d, stables',
    metrics: [
      { label: 'Net APR', value: '9.8%', tone: 'pos', hint: 'After gas and reallocation cost' },
      { label: 'Reallocations', value: '11', tone: 'neutral' },
      { label: 'Idle time', value: '3.1%', tone: 'pos', hint: 'Capital not earning' },
      { label: 'Risk floor held', value: '100%', tone: 'pos' },
    ],
    spark: walk(13, 24, 0.55),
    wallet: '0x4Fc8…B1a9',
  },
  {
    id: 'compounder',
    agentId: 84920,
    name: 'Compounder',
    handle: 'compounder.yield',
    category: 'yield',
    tagline: 'Auto-compounds LP and staking rewards on a gas-aware schedule.',
    description:
      'Compounder claims and re-stakes rewards only when the compounded gain beats the gas to do it, so small positions are not bled dry by fees.',
    protocols: ['PancakeSwap', 'Lista', 'BNB Chain'],
    reputation: 86,
    hires: 774,
    reviews: 205,
    live: true,
    verified: true,
    pricePerSession: 3,
    window: '120d',
    metrics: [
      { label: 'Net APY', value: '12.6%', tone: 'pos' },
      { label: 'Compounds', value: '38', tone: 'neutral' },
      { label: 'Gas / compound', value: '1.1 gwei', tone: 'neutral' },
      { label: 'Uptime', value: '99.4%', tone: 'pos' },
    ],
    spark: walk(23, 24, 0.5),
    wallet: '0x6Ad0…5Eef',
  },
  {
    id: 'drift-yield',
    agentId: 85500,
    name: 'Slipstream',
    handle: 'slipstream.yield',
    category: 'yield',
    tagline: 'Delta-neutral funding capture on BNB perps.',
    description:
      'Slipstream farms funding by holding spot and shorting the perp, staying market-neutral. Higher ceiling, higher complexity — read the risk notes.',
    protocols: ['BNB Chain', 'Perp DEX'],
    reputation: 76,
    hires: 289,
    reviews: 74,
    live: true,
    verified: false,
    pricePerSession: 6,
    window: '60d',
    metrics: [
      { label: 'Net APR', value: '17.2%', tone: 'pos' },
      { label: 'Funding capture', value: '82%', tone: 'pos' },
      { label: 'Neutrality drift', value: '±2.4%', tone: 'neutral' },
      { label: 'Max drawdown', value: '−4.8%', tone: 'neg' },
    ],
    spark: walk(83, 24, 0.6),
    wallet: '0x3Cd7…A0b2',
  },

  // ---------------- Health ----------------
  {
    id: 'sentinel',
    agentId: 84100,
    name: 'Sentinel',
    handle: 'sentinel.health',
    category: 'health',
    tagline: 'Defends lending positions before liquidation.',
    description:
      'Sentinel tracks your health factor across Venus and Aave and, when it falls toward the floor you set, repays debt or adds collateral from a capped allowance — within limits you can revoke any time.',
    protocols: ['Venus', 'Aave v3'],
    reputation: 96,
    hires: 1894,
    reviews: 587,
    live: true,
    verified: true,
    pricePerSession: 5,
    window: '180d, all-market',
    metrics: [
      { label: 'Liquidations', value: '0', tone: 'pos', hint: 'Across all managed positions' },
      { label: 'Avg reaction', value: '2.3 blk', tone: 'pos', hint: 'Blocks from trigger to action' },
      { label: 'HF floor held', value: '1.45', tone: 'pos' },
      { label: 'False triggers', value: '1.1%', tone: 'neutral' },
    ],
    spark: walk(17, 24, 0.5),
    wallet: '0x0B9e…7C3d',
  },
  {
    id: 'aegis',
    agentId: 84870,
    name: 'Aegis',
    handle: 'aegis.health',
    category: 'health',
    tagline: 'Multi-position portfolio health monitor with priority repay.',
    description:
      'Aegis manages several loans at once and, in a broad drawdown, repays the most at-risk position first from a shared allowance. Built for wallets running leverage across markets.',
    protocols: ['Venus', 'Aave v3', 'Lista'],
    reputation: 89,
    hires: 706,
    reviews: 188,
    live: true,
    verified: true,
    pricePerSession: 6,
    window: '120d, multi-pos',
    metrics: [
      { label: 'Liquidations', value: '0', tone: 'pos' },
      { label: 'Positions / user', value: '4.2', tone: 'neutral' },
      { label: 'Avg reaction', value: '3.0 blk', tone: 'pos' },
      { label: 'HF floor held', value: '1.35', tone: 'pos' },
    ],
    spark: walk(37, 24, 0.45),
    wallet: '0x7F21…E90a',
  },
  {
    id: 'watchtower',
    agentId: 85610,
    name: 'Watchtower',
    handle: 'watchtower.health',
    category: 'health',
    tagline: 'Alert-first monitor — notifies, acts only on confirm.',
    description:
      'Watchtower is the cautious option: it watches your health factor and alerts you, and only executes a repay if you have pre-authorised auto-action for that band. Good for users who want a human in the loop.',
    protocols: ['Venus', 'Aave v3'],
    reputation: 81,
    hires: 431,
    reviews: 110,
    live: true,
    verified: false,
    pricePerSession: 2,
    window: '90d',
    metrics: [
      { label: 'Liquidations', value: '0', tone: 'pos' },
      { label: 'Alert latency', value: '1.4 blk', tone: 'pos' },
      { label: 'Auto-actions', value: 'opt-in', tone: 'neutral' },
      { label: 'Uptime', value: '99.8%', tone: 'pos' },
    ],
    spark: walk(59, 24, 0.5),
    wallet: '0x2E88…B4f6',
  },
]

// ---- aggregate stats for the trust bar (derived, not hand-typed) ----
export const STATS = {
  agents: AGENTS.length,
  totalHires: AGENTS.reduce((s, a) => s + a.hires, 0),
  totalReviews: AGENTS.reduce((s, a) => s + a.reviews, 0),
  avgReputation: Math.round(AGENTS.reduce((s, a) => s + a.reputation, 0) / AGENTS.length),
  liveShare: Math.round((AGENTS.filter((a) => a.live).length / AGENTS.length) * 100),
}

export function categoryMeta(id: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id)!
}
