import { motion } from 'framer-motion'
import { Activity, Fuel, Blocks, TrendingUp, TrendingDown } from 'lucide-react'
import { useLiveNetwork, useCountUp } from '../lib/live'
import { fmtUsd, fmtInt, fmtGwei, fmtPct } from '../lib/format'

// A slim, genuinely-live status rail. Real BNB price, BSC block height
// and gas — polled every 15s. This is what makes "Live on BSC" true.
export default function NetworkBar() {
  const net = useLiveNetwork()
  const price = useCountUp(net.bnbPrice)
  const block = useCountUp(net.block)
  const up = (net.bnbChange24h ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
      className="flex items-center gap-x-5 gap-y-1.5 overflow-hidden"
    >
      <Item
        icon={<Activity size={13} />}
        label="BNB"
        value={net.bnbPrice == null ? '—' : fmtUsd(price)}
        loading={net.status === 'loading'}
        accessory={
          net.bnbChange24h == null ? null : (
            <span
              className="tabular inline-flex items-center gap-0.5 text-[11px] font-500"
              style={{ color: up ? 'var(--color-pos)' : 'var(--color-neg)' }}
            >
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {fmtPct(net.bnbChange24h)}
            </span>
          )
        }
      />
      <Divider />
      <Item
        icon={<Blocks size={13} />}
        label="Block"
        value={net.block == null ? '—' : fmtInt(block)}
        loading={net.status === 'loading'}
      />
      <Divider />
      <Item
        icon={<Fuel size={13} />}
        label="Gas"
        value={net.gasGwei == null ? '—' : `${fmtGwei(net.gasGwei)} gwei`}
        loading={net.status === 'loading'}
      />
      <Divider />
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px]" style={{ color: 'var(--color-faint)' }}>
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-70"
            style={{ background: net.status === 'error' ? 'var(--color-neg)' : 'var(--color-pos)', animation: 'nbping 2s var(--ease-out) infinite' }}
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: net.status === 'error' ? 'var(--color-neg)' : 'var(--color-pos)' }} />
        </span>
        {net.status === 'error' ? 'reconnecting' : 'live · BSC mainnet'}
      </div>
      <style>{`@keyframes nbping{75%,100%{transform:scale(2.4);opacity:0}}`}</style>
    </motion.div>
  )
}

function Item({
  icon,
  label,
  value,
  accessory,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accessory?: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span style={{ color: 'var(--color-faint)' }}>{icon}</span>
      <span className="text-[11.5px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>
        {label}
      </span>
      {loading ? (
        <span className="h-3.5 w-14 animate-pulse rounded" style={{ background: 'var(--color-line-strong)' }} />
      ) : (
        <span className="tabular text-[12.5px] font-600" style={{ color: 'var(--color-fg)' }}>
          {value}
        </span>
      )}
      {accessory}
    </div>
  )
}

function Divider() {
  return <span className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-line-strong)' }} />
}
