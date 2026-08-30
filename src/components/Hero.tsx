import { motion } from 'framer-motion'
import { Search, Command } from 'lucide-react'
import NetworkBar from './NetworkBar'

const ease = [0.23, 1, 0.32, 1] as const

export default function Hero({
  query,
  setQuery,
  onSearchEnter,
  onOpenPalette,
}: {
  query: string
  setQuery: (v: string) => void
  onSearchEnter: () => void
  onOpenPalette: () => void
}) {
  return (
    <section className="relative z-10 mx-auto max-w-3xl px-5 pb-14 pt-40 text-center md:pt-52">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        className="font-display text-[42px] font-700 leading-[1.02] tracking-tight md:text-[62px]"
        style={{ color: 'var(--color-fg)' }}
      >
        Hire an agent that
        <br />
        <span style={{ color: 'var(--color-accent)' }}>works the chain for you.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 0.12 }}
        className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed md:text-[16.5px]"
        style={{ color: 'var(--color-muted)' }}
      >
        Find one by the job you need done, check its real on-chain record, and put
        it to work inside a spend cap you control.
      </motion.p>

      {/* search — the CTA. Doubles as command palette entry. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 0.18 }}
        className="mx-auto mt-8 max-w-xl"
      >
        <div
          className="group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors focus-within:border-[var(--color-accent)]"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }}
        >
          <Search size={18} style={{ color: 'var(--color-faint)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
            placeholder="Search — 'protect my loan', 'grid trade BNB', 'best yield'…"
            className="flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[var(--color-faint)]"
            style={{ color: 'var(--color-fg)' }}
            aria-label="Search agents"
          />
          <button
            onClick={onOpenPalette}
            className="pressable hidden items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] sm:flex"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-faint)' }}
            aria-label="Open command palette"
          >
            <Command size={11} /> K
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12px]" style={{ color: 'var(--color-faint)' }}>
          <span>Popular:</span>
          {['liquidation guard', 'auto-compound yield', 'keep LP in range'].map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p)
                onSearchEnter()
              }}
              className="pressable rounded-full border px-2.5 py-1 transition-colors hover:text-[var(--color-fg)]"
              style={{ borderColor: 'var(--color-line)' }}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* live proof-of-life — real BSC/BNB data */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.32 }}
        className="mx-auto mt-12 flex w-fit max-w-full justify-center overflow-x-auto rounded-2xl border px-5 py-3"
        style={{
          borderColor: 'var(--color-line)',
          background: 'color-mix(in srgb, var(--color-surface) 55%, transparent)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <NetworkBar />
      </motion.div>
    </section>
  )
}
