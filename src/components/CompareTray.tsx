import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, GitCompare, BadgeCheck } from 'lucide-react'
import { AGENTS, categoryMeta, type Agent } from '../data/agents'
import { useCompare, removeCompare, clearCompare } from '../lib/compare'
import { Sparkline, Dot, toneColor } from './primitives'

export default function CompareTray({ onHire }: { onHire: (a: Agent) => void }) {
  const { ids } = useCompare()
  const [open, setOpen] = useState(false)
  const agents = ids.map((id) => AGENTS.find((a) => a.id === id)).filter((a): a is Agent => !!a)

  return (
    <>
      {/* floating tray */}
      <AnimatePresence>
        {agents.length > 0 && !open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }}
            className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-2xl"
            style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-line-strong)' }}
          >
            <div className="flex items-center gap-1.5 pl-1">
              {agents.map((a) => (
                <span key={a.id} className="group relative flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-fg)' }}>
                  {a.name}
                  <button onClick={() => removeCompare(a.id)} aria-label={`Remove ${a.name}`} className="grid h-3.5 w-3.5 place-items-center rounded" style={{ color: 'var(--color-faint)' }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => setOpen(true)}
              disabled={agents.length < 2}
              className="pressable flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-600 disabled:opacity-45"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              <GitCompare size={14} /> Compare {agents.length}
            </button>
            <button onClick={clearCompare} className="text-[12px]" style={{ color: 'var(--color-faint)' }}>
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* comparison modal */}
      <AnimatePresence>
        {open && agents.length > 0 && (
          <>
            <motion.div className="fixed inset-0 z-50" style={{ background: 'rgba(4,5,7,0.62)', backdropFilter: 'blur(4px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="fixed left-1/2 top-1/2 z-50 w-[min(94vw,860px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border shadow-2xl"
              style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-line-strong)' }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Compare agents"
            >
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
                <h2 className="flex items-center gap-2 font-display text-[16px] font-700" style={{ color: 'var(--color-fg)' }}>
                  <GitCompare size={16} style={{ color: 'var(--color-accent)' }} /> Comparing {agents.length} agents
                </h2>
                <button onClick={() => setOpen(false)} className="pressable grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }} aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto p-4">
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${agents.length}, minmax(0,1fr))` }}>
                  {agents.map((a) => {
                    const cat = categoryMeta(a.category)
                    return (
                      <div key={a.id} className="flex flex-col rounded-xl border p-4" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>{cat.label}</div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>{a.name}</h3>
                          {a.verified && <BadgeCheck size={13} style={{ color: 'var(--color-accent)' }} />}
                        </div>
                        <div className="mt-3 space-y-2.5">
                          <Row label="Reputation" value={`${a.reputation}/100`} strong />
                          <Row label="Price" value={`${a.pricePerSession} tUSDC`} />
                          <Row label="Hires" value={a.hires.toLocaleString()} />
                          <Row label="Reviews" value={String(a.reviews)} />
                          <Row label="Status" value={<span className="inline-flex items-center gap-1"><Dot live={a.live} />{a.live ? 'Live' : 'Idle'}</span>} />
                        </div>

                        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-line)' }}>
                          <div className="mb-1 text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>Track record</div>
                          <Sparkline data={a.spark} className="h-8 w-full" />
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {a.metrics.slice(0, 3).map((m) => (
                            <div key={m.label} className="flex items-center justify-between text-[11.5px]">
                              <span style={{ color: 'var(--color-faint)' }}>{m.label}</span>
                              <span className="tabular font-600" style={{ color: toneColor(m.tone) }}>{m.value}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            setOpen(false)
                            onHire(a)
                          }}
                          className="pressable mt-4 rounded-lg py-2 text-[12.5px] font-600"
                          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                        >
                          View & hire
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span style={{ color: 'var(--color-faint)' }}>{label}</span>
      <span className={strong ? 'font-display font-700' : 'tabular font-500'} style={{ color: strong ? 'var(--color-accent)' : 'var(--color-fg)' }}>
        {value}
      </span>
    </div>
  )
}
