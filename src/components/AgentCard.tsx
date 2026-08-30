import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, ArrowRight, GitCompare } from 'lucide-react'
import type { Agent } from '../data/agents'
import { categoryMeta } from '../data/agents'
import { Sparkline, ReputationRing, Dot, toneColor } from './primitives'
import { useCompare, toggleCompare } from '../lib/compare'

const AgentCard = forwardRef<HTMLButtonElement, { agent: Agent; onOpen: (a: Agent) => void }>(
  function AgentCard({ agent, onOpen }, ref) {
    const cat = categoryMeta(agent.category)
    const hero = agent.metrics[0]
    const rest = agent.metrics.slice(1, 3)
    const compare = useCompare()
    const inCompare = compare.has(agent.id)

    return (
      <motion.button
        ref={ref}
        layout
        onClick={() => onOpen(agent)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        className="card group flex flex-col gap-4 rounded-2xl border p-5 text-left"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        aria-label={`${agent.name} — ${cat.label} agent. Open details.`}
      >
        {/* top: category tag + compare + live */}
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
            style={{ color: 'var(--color-faint)' }}
          >
            {cat.label}
          </span>
          <span className="flex items-center gap-2.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
            <span
              role="button"
              tabIndex={0}
              aria-pressed={inCompare}
              aria-label={inCompare ? `Remove ${agent.name} from compare` : `Add ${agent.name} to compare`}
              onClick={(e) => {
                e.stopPropagation()
                toggleCompare(agent.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleCompare(agent.id)
                }
              }}
              className="pressable grid h-6 w-6 place-items-center rounded-md border"
              style={{
                borderColor: inCompare ? 'var(--color-accent)' : 'var(--color-line)',
                color: inCompare ? 'var(--color-accent)' : 'var(--color-faint)',
                background: inCompare ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
              }}
            >
              <GitCompare size={12} />
            </span>
            <span className="flex items-center gap-1.5">
              <Dot live={agent.live} />
              {agent.live ? 'Live' : 'Idle'}
            </span>
          </span>
        </div>

        {/* identity */}
        <div className="flex items-center gap-3">
          <ReputationRing value={agent.reputation} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-[16px] font-600" style={{ color: 'var(--color-fg)' }}>
                {agent.name}
              </h3>
              {agent.verified && <BadgeCheck size={14} style={{ color: 'var(--color-accent)' }} aria-label="Verified" />}
            </div>
            <p className="truncate font-mono text-[11px]" style={{ color: 'var(--color-faint)' }}>
              @{agent.handle}
            </p>
          </div>
        </div>

        <p className="line-clamp-2 min-h-[38px] text-[13px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {agent.tagline}
        </p>

        {/* hero metric + spark */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="tabular font-display text-[26px] font-700 leading-none" style={{ color: toneColor(hero.tone) }}>
              {hero.value}
            </div>
            <div className="mt-1 text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>
              {hero.label}
            </div>
          </div>
          <Sparkline data={agent.spark} className="h-10 w-28 opacity-90" />
        </div>

        {/* secondary metrics */}
        <div className="flex gap-5">
          {rest.map((m) => (
            <div key={m.label}>
              <div className="tabular text-[13px] font-600" style={{ color: toneColor(m.tone) }}>
                {m.value}
              </div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        <div className="hairline mt-auto" />

        {/* footer: on-chain meta swaps to hire hint on hover */}
        <div className="relative flex h-5 items-center">
          <span
            className="tabular absolute inset-0 flex items-center text-[11.5px] transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-0"
            style={{ color: 'var(--color-muted)' }}
          >
            {agent.hires.toLocaleString()} hires · {agent.reviews} reviews
          </span>
          <span
            className="absolute inset-0 flex translate-y-1 items-center justify-between text-[12px] font-500 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            style={{ color: 'var(--color-accent)' }}
          >
            <span className="tabular">Hire from {agent.pricePerSession} tUSDC</span>
            <ArrowRight size={14} />
          </span>
        </div>
      </motion.button>
    )
  },
)

export default AgentCard
