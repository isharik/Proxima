import { AnimatePresence, motion } from 'framer-motion'
import { Wallet, LogOut, AlertTriangle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { BSC, shortAddr, type WalletState } from '../lib/wallet'

interface Props {
  wallet: WalletState & {
    onBsc: boolean
    connect: () => void
    disconnect: () => void
    switchToBsc: () => void
  }
}

export default function WalletButton({ wallet }: Props) {
  const [open, setOpen] = useState(false)
  const { address, balanceBnb, onBsc, connecting } = wallet

  if (!address) {
    return (
      <button
        onClick={wallet.connect}
        disabled={connecting}
        className="pressable flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-600 disabled:opacity-60"
        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
      >
        <Wallet size={14} />
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="pressable flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px]"
        style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
      >
        {!onBsc && <AlertTriangle size={13} style={{ color: 'var(--color-accent)' }} />}
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: onBsc ? 'var(--color-pos)' : 'var(--color-accent)' }} />
        <span className="font-mono">{shortAddr(address)}</span>
        {balanceBnb != null && onBsc && (
          <span className="tabular hidden font-500 sm:inline" style={{ color: 'var(--color-muted)' }}>
            {balanceBnb.toFixed(3)} BNB
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border shadow-xl"
            style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-line-strong)' }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--color-line)' }}>
              <div className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--color-faint)' }}>
                Connected
              </div>
              <div className="mt-0.5 font-mono text-[12.5px]" style={{ color: 'var(--color-fg)' }}>
                {shortAddr(address)}
              </div>
              <div className="tabular mt-1 text-[12px]" style={{ color: 'var(--color-muted)' }}>
                {balanceBnb != null ? `${balanceBnb.toFixed(4)} BNB` : '— BNB'}
              </div>
            </div>

            {!onBsc && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={wallet.switchToBsc}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] font-500"
                style={{ color: 'var(--color-accent)' }}
              >
                <AlertTriangle size={13} /> Switch to BNB Chain
              </button>
            )}
            <a
              href={`${BSC.explorer}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.preventDefault()}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-[12.5px]"
              style={{ color: 'var(--color-muted)' }}
            >
              <ExternalLink size={13} /> View on BscScan
            </a>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                wallet.disconnect()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-[12.5px]"
              style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
            >
              <LogOut size={13} /> Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
