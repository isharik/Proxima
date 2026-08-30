import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Command, LayoutGrid, Menu, X } from 'lucide-react'
import Logo from './Logo'
import WalletButton from './WalletButton'
import { useSessions } from '../lib/sessions'
import type { WalletState } from '../lib/wallet'

type WalletApi = WalletState & {
  onBsc: boolean
  connect: () => void
  disconnect: () => void
  switchToBsc: () => void
}

export default function Navbar({
  onOpenPalette,
  onListAgent,
  onOpenMyAgents,
  wallet,
}: {
  onOpenPalette: () => void
  onListAgent: () => void
  onOpenMyAgents: () => void
  wallet: WalletApi
}) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { active } = useSessions()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300"
      style={{
        borderColor: scrolled ? 'var(--color-line)' : 'transparent',
        background: scrolled ? 'color-mix(in srgb, var(--color-bg) 72%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Logo />

        <nav className="hidden items-center gap-7 text-[13.5px] lg:flex" style={{ color: 'var(--color-muted)' }}>
          <a href="#browse" className="transition-colors hover:text-[var(--color-fg)]">Browse</a>
          <a href="#how" className="transition-colors hover:text-[var(--color-fg)]">How it works</a>
          <a href="#trust" className="transition-colors hover:text-[var(--color-fg)]">Safety</a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPalette}
            className="pressable hidden items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] md:flex"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-muted)' }}
            aria-label="Open command palette"
          >
            <span>Search</span>
            <span className="inline-flex items-center gap-0.5 font-mono text-[11px]" style={{ color: 'var(--color-faint)' }}>
              <Command size={11} /> K
            </span>
          </button>

          <button
            onClick={onOpenMyAgents}
            className="pressable relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-500"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
            aria-label="My agents"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">My agents</span>
            {active.length > 0 && (
              <span
                className="tabular grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-700"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                {active.length}
              </span>
            )}
          </button>

          <button onClick={onListAgent} className="pressable hidden rounded-lg border px-3.5 py-2 text-[12.5px] font-500 lg:block" style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}>
            List agent
          </button>

          <WalletButton wallet={wallet} />

          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="pressable grid h-9 w-9 place-items-center rounded-lg border lg:hidden"
            style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden border-t lg:hidden"
            style={{ borderColor: 'var(--color-line)', background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', backdropFilter: 'blur(12px)' }}
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3 text-[14px]" style={{ color: 'var(--color-muted)' }}>
              {[
                { href: '#browse', label: 'Browse' },
                { href: '#how', label: 'How it works' },
                { href: '#trust', label: 'Safety' },
              ].map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]">
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onListAgent()
                }}
                className="mt-1 rounded-lg border px-2 py-2.5 text-left text-[14px] font-500"
                style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
              >
                List your agent
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
