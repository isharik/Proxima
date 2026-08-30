import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, BadgeCheck, Star } from 'lucide-react'
import type { OnchainAgent } from '../lib/onchainAgents'
import { ReputationRing, Dot } from './primitives'

const LABELS: Record<string, string> = {
  rebalancing: 'Rebalancing',
  grid: 'Grid Trading',
  yield: 'Yield',
  health: 'Health Factor',
  other: 'General',
}

const RealAgentCard = forwardRef<HTMLButtonElement, { agent: OnchainAgent; onOpen: (a: OnchainAgent) => void }>(
  function RealAgentCard({ agent, onOpen }, ref) {
    return (
      <motion.button
        ref={ref}
        layout
        onClick={() => onOpen(agent)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        className="card group flex flex-col gap-3.5 rounded-2xl border p-5 text-left"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
        aria-label={`${agent.name} — on-chain agent #${agent.id}. Open details.`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: 'var(--color-faint)' }}>
            {LABELS[agent.category]} · #{agent.id}
          </span>
          <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted)' }}>
            {agent.x402 && (
              <span className="rounded px-1.5 py-0.5 text-[9.5px] font-600" style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent-soft)' }}>
                x402
              </span>
            )}
            <span className="flex items-center gap-1">
              <Dot live={agent.active} />
              {agent.active ? 'Active' : 'Idle'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {agent.avatar ? (
            <img
              src={agent.avatar}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full object-cover"
              style={{ border: '1px solid var(--color-line-strong)' }}
              onError={(e) => ((e.currentTarget.style.display = 'none'))}
            />
          ) : (
            <ReputationRing value={agent.trustScore} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-[16px] font-600" style={{ color: 'var(--color-fg)' }}>
                {agent.name}
              </h3>
              {agent.verified && <BadgeCheck size={14} style={{ color: 'var(--color-accent)' }} aria-label="Verified" />}
            </div>
            <p className="truncate font-mono text-[11px]" style={{ color: 'var(--color-faint)' }}>
              owner {agent.owner.slice(0, 6)}…{agent.owner.slice(-4)}
            </p>
          </div>
        </div>

        <p className="line-clamp-3 min-h-[54px] text-[12.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {agent.description}
        </p>

        {agent.trust.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.trust.slice(0, 3).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: 'var(--color-line)', color: 'var(--color-faint)' }}>
                <ShieldCheck size={9} /> {t}
              </span>
            ))}
          </div>
        )}

        <div className="hairline mt-auto" />
        <div className="flex items-center justify-between text-[11.5px]">
          {agent.feedbacks && agent.feedbacks > 0 ? (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <Star size={11} style={{ color: 'var(--color-accent)' }} fill="var(--color-accent)" />
              <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>{(agent.avgScore ?? 0).toFixed(1)}</span>
              {agent.feedbacks} reviews
            </span>
          ) : (
            <span style={{ color: 'var(--color-faint)' }}>
              {agent.source === 'scan' ? 'Unrated · new' : `Trust signal ${agent.trustScore}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-500 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--color-accent)' }}>
            View <ArrowRight size={13} />
          </span>
        </div>
      </motion.button>
    )
  },
)

export default RealAgentCard
