import type { ReactNode } from 'react'

// ---- Sparkline ----------------------------------------------------
export function Sparkline({
  data,
  className = '',
  strokeWidth = 1.5,
}: {
  data: number[]
  className?: string
  strokeWidth?: number
}) {
  const w = 100
  const h = 32
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${w},${h} L0,${h} Z`
  const up = data[data.length - 1] >= data[0]
  const color = up ? 'var(--color-pos)' : 'var(--color-neg)'
  const id = `sg-${Math.round(min * 1000 + max)}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Performance trend, ${up ? 'up' : 'down'} over the window`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ---- Reputation ring ---------------------------------------------
export function ReputationRing({ value, size = 44 }: { value: number; size?: number }) {
  const stroke = 3.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (value / 100) * c
  const color = value >= 90 ? 'var(--color-pos)' : value >= 80 ? 'var(--color-accent)' : 'var(--color-muted)'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line-strong)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms var(--ease-out)' }}
        />
      </svg>
      <span
        className="tabular absolute inset-0 grid place-items-center font-display text-[12px] font-600"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}

// ---- Small pieces -------------------------------------------------
export function Dot({ live }: { live: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {live && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60"
          style={{ background: 'var(--color-pos)', animation: 'ping 1.8s var(--ease-out) infinite' }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: live ? 'var(--color-pos)' : 'var(--color-faint)' }}
      />
      <style>{`@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}`}</style>
    </span>
  )
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-500 tracking-wide ${className}`}
      style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
    >
      {children}
    </span>
  )
}

export function toneColor(tone?: 'pos' | 'neg' | 'neutral') {
  return tone === 'pos' ? 'var(--color-pos)' : tone === 'neg' ? 'var(--color-neg)' : 'var(--color-fg)'
}
