import { Star } from 'lucide-react'
import type { Agent } from '../data/agents'
import { reviewsFor } from '../data/reviews'

// On-chain feedback breakdown — average, star distribution, and recent
// attestations. Data quality beyond a raw review count.
export default function ReviewsPanel({ agent }: { agent: Agent }) {
  const r = reviewsFor(agent)
  const max = Math.max(...r.distribution, 1)
  const stars = [5, 4, 3, 2, 1]

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <div className="mb-3 text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>
        On-chain feedback
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="tabular font-display text-[30px] font-700 leading-none" style={{ color: 'var(--color-fg)' }}>
            {r.average.toFixed(1)}
          </div>
          <div className="mt-1 flex justify-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={11} style={{ color: 'var(--color-accent)' }} fill={i < Math.round(r.average) ? 'var(--color-accent)' : 'none'} />
            ))}
          </div>
          <div className="mt-1 text-[10.5px]" style={{ color: 'var(--color-faint)' }}>{r.total} reviews</div>
        </div>

        <div className="flex-1 space-y-1">
          {stars.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="tabular w-3 text-[10px]" style={{ color: 'var(--color-faint)' }}>{s}</span>
              <Star size={9} style={{ color: 'var(--color-faint)' }} />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-surface)' }}>
                <div className="h-full rounded-full" style={{ width: `${(r.distribution[i] / max) * 100}%`, background: 'var(--color-accent)' }} />
              </div>
              <span className="tabular w-8 text-right text-[10px]" style={{ color: 'var(--color-faint)' }}>{r.distribution[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-line)' }}>
        {r.recent.map((rev, i) => (
          <div key={i} className="rounded-lg border p-2.5" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-muted)' }}>{rev.reviewer}</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <Star key={k} size={9} style={{ color: 'var(--color-accent)' }} fill={k < rev.rating ? 'var(--color-accent)' : 'none'} />
                  ))}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--color-faint)' }}>{rev.when}</span>
              </div>
            </div>
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{rev.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
