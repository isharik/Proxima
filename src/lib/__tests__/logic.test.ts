import { describe, it, expect, beforeEach } from 'vitest'
import { fmtUsd, fmtInt, fmtGwei, fmtPct } from '../format'
import { AGENTS, CATEGORIES, STATS } from '../../data/agents'
import { advantageFor } from '../../data/advantage'
import { reviewsFor } from '../../data/reviews'

describe('format helpers', () => {
  it('formats usd, ints, gwei, pct', () => {
    expect(fmtUsd(690.5)).toBe('$690.50')
    expect(fmtUsd(null)).toBe('—')
    expect(fmtInt(1234567)).toBe('1,234,567')
    expect(fmtGwei(0.05)).toBe('0.05')
    expect(fmtGwei(3)).toBe('3.0')
    expect(fmtPct(1.6)).toBe('+1.60%')
    expect(fmtPct(-2)).toBe('-2.00%')
  })
})

describe('agent dataset', () => {
  it('has all four categories represented', () => {
    for (const c of CATEGORIES) {
      expect(AGENTS.some((a) => a.category === c.id)).toBe(true)
    }
  })
  it('derived stats match the dataset', () => {
    expect(STATS.agents).toBe(AGENTS.length)
    expect(STATS.totalHires).toBe(AGENTS.reduce((s, a) => s + a.hires, 0))
  })
  it('every agent has a hero metric and a sparkline', () => {
    for (const a of AGENTS) {
      expect(a.metrics.length).toBeGreaterThan(0)
      expect(a.spark.length).toBeGreaterThan(1)
    }
  })
})

describe('agent advantage report', () => {
  it('produces three tasks per agent with rows', () => {
    for (const a of AGENTS) {
      const tasks = advantageFor(a)
      expect(tasks).toHaveLength(3)
      for (const t of tasks) expect(t.rows.length).toBeGreaterThan(0)
    }
  })
})

describe('reviews', () => {
  it('distribution sums to the total and average is in range', () => {
    for (const a of AGENTS) {
      const r = reviewsFor(a)
      expect(r.distribution.reduce((x, y) => x + y, 0)).toBe(a.reviews)
      expect(r.average).toBeGreaterThanOrEqual(1)
      expect(r.average).toBeLessThanOrEqual(5)
    }
  })
  it('is deterministic', () => {
    const a = AGENTS[0]
    expect(reviewsFor(a).recent[0].comment).toBe(reviewsFor(a).recent[0].comment)
  })
})

describe('compare store', () => {
  beforeEach(async () => {
    const { clearCompare } = await import('../compare')
    clearCompare()
  })
  it('caps the selection at MAX_COMPARE', async () => {
    const { toggleCompare, getCompareIds, MAX_COMPARE } = await import('../compare')
    AGENTS.slice(0, MAX_COMPARE + 2).forEach((a) => toggleCompare(a.id))
    expect(getCompareIds()).toHaveLength(MAX_COMPARE)
  })
  it('toggling an included id removes it', async () => {
    const { toggleCompare, getCompareIds } = await import('../compare')
    const id = AGENTS[0].id
    toggleCompare(id)
    expect(getCompareIds()).toContain(id)
    toggleCompare(id)
    expect(getCompareIds()).not.toContain(id)
  })
})
