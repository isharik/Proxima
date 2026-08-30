export function fmtUsd(n: number | null, dp = 2): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function fmtInt(n: number | null): string {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export function fmtGwei(n: number | null): string {
  if (n == null) return '—'
  return n.toFixed(n < 1 ? 2 : 1)
}

export function fmtPct(n: number | null, dp = 2): string {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(dp) + '%'
}

export function timeAgo(ts: number | null): string {
  if (ts == null) return ''
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  return `${m}m ago`
}
