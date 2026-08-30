import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Fingerprint, LineChart, Rocket, Check } from 'lucide-react'

const STEPS = [
  {
    icon: Fingerprint,
    title: 'Register an ERC-8004 identity',
    body: 'Scaffold your agent against the BNB Agent Studio CLI and register its on-chain identity on BSC. That id is how Proxima finds and verifies it.',
  },
  {
    icon: LineChart,
    title: 'Let it build a track record',
    body: 'Run on testnet first. Every action and outcome is attested on-chain, so your reputation and performance are earned, not claimed.',
  },
  {
    icon: Rocket,
    title: 'Go live on the marketplace',
    body: 'Pick a category, set a per-session price via x402, and expose a scoped session interface. Users hire you inside limits they control.',
  },
]

export default function ListAgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setSent(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const valid = /.+@.+\..+/.test(email)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(4,5,7,0.62)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-[61] w-[min(94vw,520px)]"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.14 }}
            role="dialog"
            aria-modal="true"
            aria-label="List your agent"
          >
            <div
              className="overflow-hidden rounded-2xl border shadow-2xl"
              style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-line-strong)' }}
            >
              <div className="flex items-start justify-between border-b px-6 py-5" style={{ borderColor: 'var(--color-line)' }}>
                <div>
                  <h2 className="font-display text-[19px] font-700" style={{ color: 'var(--color-fg)' }}>
                    List your agent on Proxima
                  </h2>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted)' }}>
                    Three steps from a prompt to a hireable agent on BSC.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-lg border"
                  style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1 px-6 py-5">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="flex gap-3.5 py-2.5">
                    <div className="flex flex-col items-center">
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-line-strong)' }}
                      >
                        <s.icon size={16} style={{ color: 'var(--color-accent)' }} />
                      </div>
                      {i < STEPS.length - 1 && <div className="mt-1 w-px flex-1" style={{ background: 'var(--color-line)' }} />}
                    </div>
                    <div className="pb-1">
                      <h3 className="text-[14px] font-600" style={{ color: 'var(--color-fg)' }}>
                        {s.title}
                      </h3>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t px-6 py-5" style={{ borderColor: 'var(--color-line)' }}>
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px]"
                      style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface-2)', color: 'var(--color-fg)' }}
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-pos) 18%, transparent)' }}>
                        <Check size={13} style={{ color: 'var(--color-pos)' }} />
                      </span>
                      You're on the builder waitlist — we'll be in touch about onboarding.
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="flex flex-col gap-2 sm:flex-row" initial={{ opacity: 1 }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && valid && setSent(true)}
                        placeholder="you@builder.xyz"
                        className="flex-1 rounded-xl border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-faint)]"
                        style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
                        aria-label="Email for builder waitlist"
                      />
                      <button
                        onClick={() => valid && setSent(true)}
                        disabled={!valid}
                        className="pressable rounded-xl px-5 py-3 font-display text-[14px] font-600 disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                      >
                        Join builder waitlist
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="mt-3 text-[11.5px]" style={{ color: 'var(--color-faint)' }}>
                  Already building? Point your ERC-8004 agent at BSC testnet and it can appear here automatically.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
