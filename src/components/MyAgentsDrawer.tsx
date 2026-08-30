import { motion, AnimatePresence } from 'framer-motion'
import { X, Ban, Inbox, ShieldCheck, Link2, ExternalLink } from 'lucide-react'
import { useSessions, revokeSession, type Session } from '../lib/sessions'
import { categoryMeta } from '../data/agents'
import { shortAddr } from '../lib/wallet'

export default function MyAgentsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active } = useSessions()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(4,5,7,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[440px] flex-col border-l"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
            role="dialog"
            aria-modal="true"
            aria-label="My agents"
          >
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <h2 className="font-display text-[16px] font-700" style={{ color: 'var(--color-fg)' }}>
                  My agents
                </h2>
                <p className="text-[12px]" style={{ color: 'var(--color-faint)' }}>
                  {active.length} active session{active.length === 1 ? '' : 's'}
                </p>
              </div>
              <button onClick={onClose} className="pressable grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {active.length === 0 ? (
                <div className="grid place-items-center py-24 text-center">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-line)' }}>
                    <Inbox size={20} style={{ color: 'var(--color-faint)' }} />
                  </div>
                  <p className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>
                    No agents hired yet
                  </p>
                  <p className="mt-1 max-w-[240px] text-[12.5px]" style={{ color: 'var(--color-muted)' }}>
                    Hire an agent and its active session shows up here — spend, expiry, and a revoke switch.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {active.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </div>

            {active.length > 0 && (
              <div className="border-t px-6 py-3.5 text-[11.5px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-faint)' }}>
                <ShieldCheck size={13} className="mr-1.5 -mt-0.5 inline" style={{ color: 'var(--color-pos)' }} />
                Every session is scoped and revocable. Nothing runs outside its limits.
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function SessionCard({ session }: { session: Session }) {
  const cat = categoryMeta(session.category as never)
  const pct = Math.min(100, (session.spent / session.cap) * 100)
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>
              {session.agentName}
            </span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-500" style={{ background: 'var(--color-surface)', color: 'var(--color-faint)' }}>
              {cat.label}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--color-faint)' }}>
            {session.sessionKey}
          </div>
        </div>
        <button
          onClick={() => revokeSession(session.id)}
          className="pressable flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-500"
          style={{ borderColor: 'color-mix(in srgb, var(--color-neg) 40%, var(--color-line))', color: 'var(--color-neg)' }}
        >
          <Ban size={12} /> Revoke
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span style={{ color: 'var(--color-faint)' }}>Spent of cap</span>
          <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>
            {session.spent.toFixed(1)} / {session.cap} tUSDC
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-surface)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'var(--color-accent)' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--color-muted)' }}>
        <span>Expires in {countdown(session.expiresAt)}</span>
        <span>
          {session.onChain ? (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-pos)' }}>
              <Link2 size={11} /> on-chain
            </span>
          ) : session.signature ? (
            <span style={{ color: 'var(--color-pos)' }}>signed authorization</span>
          ) : session.owner ? (
            shortAddr(session.owner)
          ) : (
            'demo grant'
          )}
        </span>
      </div>

      {session.onChain && session.explorerUrl && (
        <a
          href={session.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[11.5px] font-500"
          style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}
        >
          View on BscScan (testnet) <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

function countdown(ts: number): string {
  const ms = ts - Date.now()
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3600000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}
