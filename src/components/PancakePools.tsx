import { ExternalLink } from 'lucide-react'
import { usePancakePools } from '../lib/pancake'
import { fmtUsd } from '../lib/format'

// Live PancakeSwap v3 pools this agent operates on — real on-chain price
// + liquidity + fee tier, read from the pool contract. Demonstrates a
// concrete PancakeSwap benefit with genuinely live data.
export default function PancakePools() {
  const { pools, status } = usePancakePools()

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>
          Live PancakeSwap v3 pools
        </span>
        <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: status === 'error' ? 'var(--color-neg)' : 'var(--color-pos)', animation: 'nbping 2s var(--ease-out) infinite' }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: status === 'error' ? 'var(--color-neg)' : 'var(--color-pos)' }} />
          </span>
          {status === 'error' ? 'RPC unreachable' : 'on-chain'}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--color-surface)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {pools.map((p) => (
            <a
              key={p.pool}
              href={p.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:border-[var(--color-line-strong)]"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
            >
              <div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-600" style={{ color: 'var(--color-fg)' }}>
                  {p.priceLabel}
                  <span className="rounded px-1 py-0.5 font-mono text-[9.5px]" style={{ background: 'var(--color-surface-2)', color: 'var(--color-faint)' }}>
                    {(p.feeTier / 10000).toFixed(2)}%
                  </span>
                </div>
                <div className="font-mono text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
                  {p.pool.slice(0, 8)}…{p.pool.slice(-4)}
                </div>
              </div>
              <div className="text-right">
                <div className="tabular text-[13px] font-600" style={{ color: 'var(--color-accent)' }}>
                  {fmtUsd(p.price)}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
                  in-range L {formatL(p.liquidity)} <ExternalLink size={10} />
                </div>
              </div>
            </a>
          ))}
          <p className="pt-0.5 text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
            Price & liquidity read live from the pool contract on BNB Chain.
          </p>
        </div>
      )}
    </div>
  )
}

function formatL(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(0)
}
