import type { Agent } from './agents'

// ------------------------------------------------------------------
//  Reviews derived from an agent's ERC-8004 feedback attestations.
//  Deterministic from the agent so the same agent always shows the
//  same breakdown. Representative in this build; the shape matches
//  what 8004scan's feedback endpoint returns, so it swaps to live.
// ------------------------------------------------------------------

export interface Review {
  reviewer: string
  rating: number
  comment: string
  when: string
}

export interface ReviewSummary {
  average: number
  total: number
  distribution: number[] // index 0 = 5★ … index 4 = 1★, as counts
  recent: Review[]
}

const COMMENTS_BY_CAT: Record<string, string[]> = {
  rebalancing: [
    'Kept my position in range through a rough week. Barely touched it.',
    'Resets are well-timed. Gas stayed low.',
    'Widened before a big move, saved me from going out of range.',
  ],
  grid: [
    'Caught the chop nicely. Steady small wins.',
    'Halted on the breakout instead of averaging down. Exactly what I wanted.',
    'Set it and forgot it for a month. Positive PnL.',
  ],
  yield: [
    'Moved my stables to a better rate twice without me lifting a finger.',
    'Respected my risk floor even when a juicy market showed up.',
    'Compounds on schedule. Small position, still worth it.',
  ],
  health: [
    'Repaid before I even saw the alert. No liquidation.',
    'Watched three loans at once during a drawdown. Handled the worst one first.',
    'Alert-first mode gave me the final say. Comfortable with it.',
  ],
}

function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

export function reviewsFor(agent: Agent): ReviewSummary {
  const rand = rng(agent.agentId)
  const total = agent.reviews
  // skew the distribution toward 5★ as reputation climbs
  const rep = agent.reputation / 100
  const weights = [rep * 0.7 + 0.15, rep * 0.2 + 0.1, 0.08, 0.04, 0.03] // 5★..1★
  const wSum = weights.reduce((a, b) => a + b, 0)
  const distribution = weights.map((w) => Math.round((w / wSum) * total))
  // fix rounding so it sums to total
  const diff = total - distribution.reduce((a, b) => a + b, 0)
  distribution[0] += diff

  const stars = [5, 4, 3, 2, 1]
  let weightedSum = 0
  distribution.forEach((c, i) => (weightedSum += c * stars[i]))
  const average = total ? weightedSum / total : 0

  const pool = COMMENTS_BY_CAT[agent.category]
  const recent: Review[] = pool.slice(0, 3).map((comment, i) => {
    const hex = '0123456789abcdef'
    let addr = '0x'
    for (let k = 0; k < 4; k++) addr += hex[Math.floor(rand() * 16)]
    addr += '…'
    for (let k = 0; k < 4; k++) addr += hex[Math.floor(rand() * 16)]
    const rating = i === 2 && agent.reputation < 88 ? 4 : 5
    const days = 1 + Math.floor(rand() * 20)
    return { reviewer: addr, rating, comment, when: `${days}d ago` }
  })

  return { average, total, distribution, recent }
}
