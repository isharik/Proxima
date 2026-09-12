import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, GitCompare, Star, BadgeCheck, ArrowRight } from 'lucide-react'
import type { OnchainAgent, ScanDetail } from '../lib/onchainAgents'
import { fetchScanAgentDetail } from '../lib/onchainAgents'
import { useLiveCompare } from '../lib/liveCompare'

function endpointHost(url?: string) {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const ease = [0.23, 1, 0.32, 1] as const
const LABELS: Record<string, string> = {
  rebalancing: 'Rebalancing',
  grid: 'Grid Trading',
  yield: 'Yield',
  health: 'Health Factor',
  other: 'General',
}

function repValue(a: OnchainAgent) {
  return a.feedbacks && a.feedbacks > 0 ? Math.round((a.avgScore ?? 0) * 20) : a.trustScore
}

export default function LiveCompareBar({ onOpen }: { onOpen: (a: OnchainAgent) => void }) {
  const { items, remove, clear, full } = useLiveCompare()
  const [modal, setModal] = useState(false)
  const [details, setDetails] = useState<Record<number, ScanDetail | null>>({})

  // When the comparison opens, pull each agent's full 8004scan record so the
  // table can show endpoints, the score breakdown and rank — not just the
  // fields already on the card.
  useEffect(() => {
    if (!modal) return
    let alive = true
    items.forEach((a) => {
      if (a.source === 'scan' && details[a.id] === undefined) {
        fetchScanAgentDetail(a.id).then((d) => {
          if (alive) setDetails((prev) => ({ ...prev, [a.id]: d }))
        })
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, items])

  const scoreOf = (a: OnchainAgent, label: string) => details[a.id]?.scores.find((s) => s.label === label)?.value

  const bestRep = Math.max(...items.map(repValue), 0)
  const bestReviews = Math.max(...items.map((a) => a.feedbacks ?? 0), 0)

  const rows: { label: string; render: (a: OnchainAgent) => ReactNode; best?: (a: OnchainAgent) => boolean }[] = [
    { label: 'Category', render: (a) => LABELS[a.category] },
    {
      label: 'Reputation',
      render: (a) =>
        a.feedbacks && a.feedbacks > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star size={12} style={{ color: 'var(--color-accent)' }} fill="var(--color-accent)" />
            <span className="font-600" style={{ color: 'var(--color-fg)' }}>{(a.avgScore ?? 0).toFixed(1)}</span>
            <span style={{ color: 'var(--color-faint)' }}>/5</span>
          </span>
        ) : (
          <span style={{ color: 'var(--color-muted)' }}>Trust {a.trustScore}</span>
        ),
      best: (a) => repValue(a) === bestRep && bestRep > 0,
    },
    {
      label: 'On-chain reviews',
      render: (a) => <span className="tabular" style={{ color: 'var(--color-fg)' }}>{a.feedbacks ?? 0}</span>,
      best: (a) => (a.feedbacks ?? 0) === bestReviews && bestReviews > 0,
    },
    {
      label: 'Verified',
      render: (a) =>
        a.verified ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
            <BadgeCheck size={13} /> Yes
          </span>
        ) : (
          <span style={{ color: 'var(--color-faint)' }}>No</span>
        ),
      best: (a) => !!a.verified,
    },
    {
      label: 'Pays per call (x402)',
      render: (a) => <span style={{ color: a.x402 ? 'var(--color-fg)' : 'var(--color-faint)' }}>{a.x402 ? 'Yes' : 'No'}</span>,
      best: (a) => !!a.x402,
    },
    {
      label: 'Quality score',
      render: (a) => {
        const v = scoreOf(a, 'Quality')
        return v == null ? <span style={{ color: 'var(--color-faint)' }}>—</span> : <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>{Math.round(v)}</span>
      },
    },
    {
      label: 'Popularity score',
      render: (a) => {
        const v = scoreOf(a, 'Popularity')
        return v == null ? <span style={{ color: 'var(--color-faint)' }}>—</span> : <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>{Math.round(v)}</span>
      },
    },
    {
      label: 'Capabilities',
      render: (a) => {
        const tags = details[a.id]?.tags?.length ? details[a.id]!.tags : a.trust
        return <span style={{ color: 'var(--color-muted)' }}>{tags.length ? tags.slice(0, 4).join(', ') : '—'}</span>
      },
    },
    {
      label: 'Endpoints',
      render: (a) => {
        const d = details[a.id]
        const a2a = endpointHost(d?.a2aEndpoint)
        const mcp = endpointHost(d?.mcpServer)
        if (!a2a && !mcp) return <span style={{ color: 'var(--color-faint)' }}>—</span>
        return (
          <span className="flex flex-col gap-0.5 font-mono text-[11px]" style={{ color: 'var(--color-muted)' }}>
            {a2a && <span>A2A · {a2a}{d?.isTermix ? ' · TermiX' : ''}</span>}
            {mcp && <span>MCP · {mcp}</span>}
          </span>
        )
      },
    },
    {
      label: 'Network rank',
      render: (a) => (a.rank != null ? <span className="tabular" style={{ color: 'var(--color-fg)' }}>#{a.rank}</span> : <span style={{ color: 'var(--color-faint)' }}>—</span>),
    },
    {
      label: 'What it does',
      render: (a) => <span style={{ color: 'var(--color-muted)' }}>{a.description ? a.description.slice(0, 70) + (a.description.length > 70 ? '…' : '') : '—'}</span>,
    },
    {
      label: 'Source',
      render: (a) => <span style={{ color: 'var(--color-muted)' }}>{a.source === 'scan' ? '8004scan API' : 'on-chain registry'}</span>,
    },
    {
      label: 'Owner',
      render: (a) => (
        <span className="font-mono text-[11px]" style={{ color: 'var(--color-faint)' }}>
          {a.owner.slice(0, 6)}…{a.owner.slice(-4)}
        </span>
      ),
    },
  ]

  return (
    <>
      {/* floating tray */}
      <AnimatePresence>
        {items.length > 0 && !modal && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease }}
            className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[94vw] items-center gap-3 rounded-2xl border px-3 py-2.5"
            style={{
              background: 'color-mix(in srgb, var(--color-surface) 82%, transparent)',
              borderColor: 'var(--color-line-strong)',
              backdropFilter: 'blur(16px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
              boxShadow: '0 18px 50px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1.5 text-[12px]"
                  style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
                >
                  <span className="max-w-[120px] truncate">{a.name}</span>
                  <button
                    onClick={() => remove(a.id)}
                    className="pressable grid h-4 w-4 place-items-center rounded-full"
                    style={{ color: 'var(--color-faint)' }}
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {!full && (
                <span className="px-1 text-[11.5px]" style={{ color: 'var(--color-faint)' }}>
                  add up to {3 - items.length} more
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={clear}
                className="pressable rounded-lg px-2.5 py-1.5 text-[12px]"
                style={{ color: 'var(--color-muted)' }}
              >
                Clear
              </button>
              <button
                onClick={() => setModal(true)}
                disabled={items.length < 2}
                className="pressable inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-600 disabled:opacity-45"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                <GitCompare size={13} /> Compare {items.length}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* comparison modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(4,5,8,0.72)', backdropFilter: 'blur(4px)' }}
              onClick={() => setModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.26, ease }}
              className="relative max-h-[88vh] w-full max-w-3xl overflow-auto rounded-3xl border"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-line-strong)' }}
            >
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <h3 className="font-display text-[17px] font-700" style={{ color: 'var(--color-fg)' }}>
                    Compare agents
                  </h3>
                  <p className="text-[12px]" style={{ color: 'var(--color-muted)' }}>
                    Real on-chain records, side by side. Amber marks the strongest on each row.
                  </p>
                </div>
                <button
                  onClick={() => setModal(false)}
                  className="pressable grid h-8 w-8 place-items-center rounded-lg border"
                  style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
                  aria-label="Close comparison"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 px-4 py-3 text-left" style={{ background: 'var(--color-bg)' }} />
                      {items.map((a) => (
                        <th key={a.id} className="min-w-[150px] px-4 py-3 text-left align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-display text-[14px] font-600" style={{ color: 'var(--color-fg)' }}>
                              {a.name}
                            </span>
                            {a.verified && <BadgeCheck size={13} style={{ color: 'var(--color-accent)' }} />}
                          </div>
                          <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-faint)' }}>#{a.id}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                        <td
                          className="sticky left-0 z-10 px-4 py-3 text-[12px] font-500"
                          style={{ background: 'var(--color-bg)', color: 'var(--color-faint)' }}
                        >
                          {row.label}
                        </td>
                        {items.map((a) => {
                          const isBest = row.best?.(a)
                          return (
                            <td
                              key={a.id}
                              className="px-4 py-3"
                              style={{ background: isBest ? 'color-mix(in srgb, var(--color-accent) 9%, transparent)' : 'transparent' }}
                            >
                              {row.render(a)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr className="border-t" style={{ borderColor: 'var(--color-line)' }}>
                      <td className="sticky left-0 z-10 px-4 py-3" style={{ background: 'var(--color-bg)' }} />
                      {items.map((a) => (
                        <td key={a.id} className="px-4 py-3">
                          <button
                            onClick={() => {
                              setModal(false)
                              onOpen(a)
                            }}
                            className="pressable inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-600"
                            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                          >
                            View & hire <ArrowRight size={12} />
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
