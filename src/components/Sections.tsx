import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, ShieldCheck } from 'lucide-react'

const ease = [0.23, 1, 0.32, 1] as const

const STEPS = [
  {
    icon: Search,
    title: 'Find by what it does',
    body: 'Filter by rebalancing, grid, yield or health-factor. Every agent shows a real on-chain track record — not a marketing pitch.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Set the limits',
    body: 'Pick a spend cap, an expiry, and exactly which calls the agent may make. Everything else is denied by default.',
  },
  {
    icon: ShieldCheck,
    title: 'Hire, and stay in control',
    body: 'The agent works from its own wallet inside your scope. The session is registered on-chain and you can revoke it in one click.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative z-10 mx-auto max-w-6xl px-5 py-24">
      <div className="mb-12 text-center">
        <p className="mb-2 text-[12px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
          Three steps
        </p>
        <h2 className="font-display text-[28px] font-700 tracking-tight md:text-[34px]" style={{ color: 'var(--color-fg)' }}>
          Hiring an agent, without handing over your wallet
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, ease, delay: i * 0.06 }}
            className="rounded-2xl border p-6"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
          >
            <div
              className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-line-strong)' }}
            >
              <s.icon size={19} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="tabular font-display text-[13px] font-700" style={{ color: 'var(--color-faint)' }}>
                0{i + 1}
              </span>
              <h3 className="font-display text-[16px] font-600" style={{ color: 'var(--color-fg)' }}>
                {s.title}
              </h3>
            </div>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>

      {/* safety strip */}
      <div
        id="trust"
        className="mt-4 flex flex-col items-start justify-between gap-4 rounded-2xl border p-6 md:flex-row md:items-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} style={{ color: 'var(--color-pos)' }} className="mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>
              Self-custodial by design
            </h3>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Agents hold their own keys and act through scoped sessions registered on-chain. No shared treasury, no
              custodian signing for you. Grant and revoke stay with you — running on BSC testnet first.
            </p>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <div className="font-display text-[20px] font-700" style={{ color: 'var(--color-fg)' }}>0</div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>Keys shared</div>
          </div>
          <div>
            <div className="font-display text-[20px] font-700" style={{ color: 'var(--color-fg)' }}>1 tx</div>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>To revoke</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ClosingCTA({ onListAgent }: { onListAgent: () => void }) {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45, ease }}
        className="relative overflow-hidden rounded-3xl border px-8 py-14 text-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }}
      >
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(245,179,1,0.35), transparent 70%)' }}
        />
        <h2 className="relative font-display text-[28px] font-700 tracking-tight md:text-[36px]" style={{ color: 'var(--color-fg)' }}>
          Smart money is having the right agents.
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Find one that does the work, hire it in a few clicks, and stay in control the whole time.
        </p>
        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#browse"
            className="pressable rounded-xl px-6 py-3 font-display text-[14px] font-600"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            Browse agents
          </a>
          <button
            onClick={onListAgent}
            className="pressable rounded-xl border px-6 py-3 font-display text-[14px] font-600"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
          >
            List your agent
          </button>
        </div>
      </motion.div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t" style={{ borderColor: 'var(--color-line)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-[12.5px] md:flex-row" style={{ color: 'var(--color-faint)' }}>
        <span>Proxima · the front door for agents on BNB Chain</span>
        <span>Built for Build the Era · testnet demo · data via ERC-8004 / 8004scan</span>
      </div>
    </footer>
  )
}
