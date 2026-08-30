import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  BadgeCheck,
  ShieldCheck,
  Wallet,
  Clock,
  ListChecks,
  ArrowLeft,
  Check,
  Ban,
  ExternalLink,
  PenLine,
  Fingerprint,
  AlertTriangle,
  Link2,
} from 'lucide-react'
import type { Agent } from '../data/agents'
import { categoryMeta } from '../data/agents'
import { Sparkline, ReputationRing, Dot, Chip, toneColor } from './primitives'
import CategoryViz from './CategoryViz'
import AdvantageReport from './AdvantageReport'
import PancakePools from './PancakePools'
import ReviewsPanel from './ReviewsPanel'
import { useLiveNetwork } from '../lib/live'
import { fmtGwei } from '../lib/format'
import { shortAddr, type WalletState } from '../lib/wallet'
import { addSession, revokeSession, useSessions, type Session } from '../lib/sessions'
import { grantOnChain, revokeOnChain, passkeySupported, altanaError, ALTANA_FAUCET } from '../lib/altana'

type Stage = 'detail' | 'configure' | 'granting' | 'active'
type Tab = 'overview' | 'advantage'

type WalletApi = WalletState & {
  onBsc: boolean
  connect: () => void
  switchToBsc: () => void
  signMessage: (m: string) => Promise<string | null>
}

const EXPIRIES = [
  { label: '24 hours', h: 24 },
  { label: '7 days', h: 168 },
  { label: '30 days', h: 720 },
]

const CALLS: Record<string, string[]> = {
  rebalancing: ['positions.read', 'lp.rebalance', 'lp.collectFees'],
  grid: ['orders.read', 'order.place', 'order.cancel'],
  yield: ['markets.read', 'vault.deposit', 'vault.withdraw'],
  health: ['position.read', 'debt.repay', 'collateral.add'],
}

function randHex(n: number) {
  const h = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)]
  return s
}
function fakeSessionKey() {
  return '0x' + randHex(8) + '…' + randHex(4)
}

export default function HireDrawer({
  agent,
  onClose,
  wallet,
}: {
  agent: Agent | null
  onClose: () => void
  wallet: WalletApi
}) {
  const [stage, setStage] = useState<Stage>('detail')
  const [tab, setTab] = useState<Tab>('overview')
  const [cap, setCap] = useState(250)
  const [expiry, setExpiry] = useState(EXPIRIES[1])
  const [signing, setSigning] = useState(false)
  const [onChainMode, setOnChainMode] = useState(false)
  const [chainStatus, setChainStatus] = useState<string>('')
  const [chainError, setChainError] = useState<string>('')
  const { sessions } = useSessions()
  const canOnChain = passkeySupported()

  const liveSession = useMemo<Session | undefined>(
    () => (agent ? sessions.find((s) => s.agentId === agent.id && !s.revoked && s.expiresAt > Date.now()) : undefined),
    [sessions, agent],
  )

  const net = useLiveNetwork()

  useEffect(() => {
    if (agent) {
      setTab('overview')
      setCap(250)
      setExpiry(EXPIRIES[1])
      setOnChainMode(false)
      setChainStatus('')
      setChainError('')
      // if already hired, jump straight to the active view
      const existing = sessions.find((s) => s.agentId === agent.id && !s.revoked && s.expiresAt > Date.now())
      setStage(existing ? 'active' : 'detail')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (agent) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [agent, onClose])

  async function grant() {
    if (!agent) return
    setChainError('')
    const calls = CALLS[agent.category]
    const expiresAt = Date.now() + expiry.h * 3600 * 1000
    const expiryUnix = Math.floor(expiresAt / 1000)

    // ── Real on-chain path (Altana testnet, passkey-authorized) ──
    if (onChainMode && canOnChain) {
      setStage('granting')
      setChainStatus('Approve the passkey to create your Altana wallet…')
      try {
        setChainStatus('Registering the session on BSC testnet…')
        const res = await grantOnChain({ agentName: agent.name, capUsd: cap, expiryUnix })
        const session: Session = {
          id: res.publicKey || fakeSessionKey(),
          agentId: agent.id,
          agentName: agent.name,
          category: agent.category,
          cap,
          spent: 0,
          calls,
          expiresAt,
          createdAt: Date.now(),
          sessionKey: res.publicKey.slice(0, 10) + '…' + res.publicKey.slice(-4),
          agentWallet: res.walletAddress,
          owner: res.walletAddress,
          signature: null,
          revoked: false,
          onChain: true,
          txHash: res.transactionHash,
          publicKey: res.publicKey,
          explorerUrl: res.explorerUrl,
        }
        addSession(session)
        setChainStatus('')
        setStage('active')
      } catch (e) {
        setChainError(altanaError(e))
        setChainStatus('')
        setStage('configure')
      }
      return
    }

    // ── Signed-authorization path (real wallet signature, off-chain) ──
    setStage('granting')
    const sessionKey = fakeSessionKey()
    const agentWallet = '0x' + randHex(4) + '…' + randHex(4)
    let signature: string | null = null
    if (wallet.address) {
      setSigning(true)
      const message =
        `Proxima — authorize agent session\n\n` +
        `Agent: ${agent.name} (#${agent.agentId})\n` +
        `Owner: ${wallet.address}\n` +
        `Spend cap: ${cap} tUSDC\n` +
        `Expires: ${new Date(expiresAt).toISOString()}\n` +
        `Allowed calls: ${calls.join(', ')}\n` +
        `Session key: ${sessionKey}`
      signature = await wallet.signMessage(message)
      setSigning(false)
      if (!signature) {
        setStage('configure')
        return
      }
    }

    const session: Session = {
      id: sessionKey,
      agentId: agent.id,
      agentName: agent.name,
      category: agent.category,
      cap,
      spent: 0,
      calls,
      expiresAt,
      createdAt: Date.now(),
      sessionKey,
      agentWallet,
      owner: wallet.address,
      signature,
      revoked: false,
    }
    addSession(session)
    window.setTimeout(() => setStage('active'), signature ? 200 : 900)
  }

  async function doRevoke() {
    if (liveSession) {
      if (liveSession.onChain && liveSession.publicKey) {
        setChainStatus('Revoking on-chain…')
        try {
          await revokeOnChain(liveSession.publicKey)
        } catch {
          /* still revoke locally; user can retry on-chain from BscScan */
        }
        setChainStatus('')
      }
      revokeSession(liveSession.id)
    }
    setStage('detail')
  }

  const cat = agent ? categoryMeta(agent.category) : null
  const calls = agent ? CALLS[agent.category] : []

  return (
    <AnimatePresence>
      {agent && cat && (
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
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[480px] flex-col border-l"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${agent.name} details`}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-muted)' }}>
                <span className="rounded-md px-2 py-0.5 text-[11px] font-500" style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent-soft)' }}>
                  {cat.label}
                </span>
                <Dot live={agent.live} />
                {agent.live ? 'Live on BSC' : 'Idle'}
              </div>
              <button
                onClick={onClose}
                className="pressable grid h-8 w-8 place-items-center rounded-lg border"
                style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-start gap-3.5">
                <ReputationRing value={agent.reputation} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-[20px] font-700" style={{ color: 'var(--color-fg)' }}>
                      {agent.name}
                    </h2>
                    {agent.verified && <BadgeCheck size={16} style={{ color: 'var(--color-accent)' }} />}
                  </div>
                  <p className="font-mono text-[12px]" style={{ color: 'var(--color-faint)' }}>
                    @{agent.handle} · agent #{agent.agentId}
                  </p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* ---------------- DETAIL ---------------- */}
                {stage === 'detail' && (
                  <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
                    {/* tabs */}
                    <div className="mt-4 flex gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface-2)' }}>
                      {(['overview', 'advantage'] as Tab[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className="pressable relative flex-1 rounded-md py-1.5 text-[12.5px] font-500 capitalize"
                          style={{ color: tab === t ? 'var(--color-on-accent)' : 'var(--color-muted)' }}
                        >
                          {tab === t && (
                            <motion.span layoutId="drawer-tab" className="absolute inset-0 rounded-md" style={{ background: 'var(--color-accent)' }} transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />
                          )}
                          <span className="relative z-10">{t === 'advantage' ? 'Agent advantage' : 'Overview'}</span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {tab === 'overview' ? (
                        <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                          <p className="mt-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                            {agent.description}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {agent.protocols.map((p) => (
                              <Chip key={p}>{p}</Chip>
                            ))}
                          </div>

                          <div className="mt-5">
                            <CategoryViz agent={agent} />
                          </div>

                          {agent.protocols.some((p) => /pancake/i.test(p)) && (
                            <div className="mt-4">
                              <PancakePools />
                            </div>
                          )}

                          <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between">
                              <SectionLabel>Track record · {agent.window}</SectionLabel>
                              <Sparkline data={agent.spark} className="h-7 w-28" />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              {agent.metrics.map((m) => (
                                <div key={m.label} className="rounded-xl border p-3" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                                  <div className="tabular font-display text-[18px] font-600" style={{ color: toneColor(m.tone) }}>
                                    {m.value}
                                  </div>
                                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--color-faint)' }}>
                                    {m.label}
                                  </div>
                                  {m.hint && (
                                    <div className="mt-1 text-[10.5px] leading-snug" style={{ color: 'var(--color-faint)' }}>
                                      {m.hint}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-5">
                            <ReviewsPanel agent={agent} />
                          </div>

                          <div className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--color-pos)' }} />
                            Identity & reputation via ERC-8004 · {agent.reviews} feedback attestations
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="adv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                          <AdvantageReport agent={agent} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ---------------- CONFIGURE ---------------- */}
                {stage === 'configure' && (
                  <motion.div key="configure" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
                    <div className="mt-4 rounded-xl border p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                      You are granting <span style={{ color: 'var(--color-fg)' }}>{agent.name}</span> a scoped session on its own wallet. It can only make the calls below, cannot exceed the cap, and the grant expires on its own. You keep the keys — revoke any time.
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <SectionLabel>
                          <Wallet size={13} className="mr-1.5 -mt-0.5 inline" />
                          Spend cap
                        </SectionLabel>
                        <span className="tabular font-display text-[15px] font-600" style={{ color: 'var(--color-accent)' }}>
                          {cap} <span className="text-[11px] font-400" style={{ color: 'var(--color-faint)' }}>tUSDC</span>
                        </span>
                      </div>
                      <input type="range" min={25} max={1000} step={25} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" aria-label="Spend cap in test USDC" />
                      <div className="flex justify-between text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
                        <span>25</span>
                        <span>testnet funds only</span>
                        <span>1000</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <SectionLabel>
                        <Clock size={13} className="mr-1.5 -mt-0.5 inline" />
                        Session expiry
                      </SectionLabel>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {EXPIRIES.map((e) => {
                          const on = e.h === expiry.h
                          return (
                            <button
                              key={e.h}
                              onClick={() => setExpiry(e)}
                              className="pressable rounded-lg border py-2 text-[12.5px] font-500"
                              style={{
                                borderColor: on ? 'var(--color-accent)' : 'var(--color-line)',
                                background: on ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)',
                                color: on ? 'var(--color-accent-soft)' : 'var(--color-muted)',
                              }}
                            >
                              {e.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-5">
                      <SectionLabel>
                        <ListChecks size={13} className="mr-1.5 -mt-0.5 inline" />
                        Allowed calls
                      </SectionLabel>
                      <div className="mt-2 space-y-1.5">
                        {calls.map((c) => (
                          <div key={c} className="flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[12px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                            <Check size={13} style={{ color: 'var(--color-pos)' }} />
                            {c}
                          </div>
                        ))}
                        <p className="pt-1 text-[11px]" style={{ color: 'var(--color-faint)' }}>
                          Every other call is denied by default. Registered on-chain in Keystore.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: 'var(--color-pos)', animation: 'nbping 2s var(--ease-out) infinite' }} />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-pos)' }} />
                        </span>
                        Live BSC gas
                      </span>
                      <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>
                        {net.gasGwei == null ? '—' : `${fmtGwei(net.gasGwei)} gwei`}
                        <span className="ml-1 font-400" style={{ color: 'var(--color-faint)' }}>· cheap on BSC</span>
                      </span>
                    </div>

                    {/* authorization mode */}
                    <div className="mt-5">
                      <SectionLabel>
                        <ShieldCheck size={13} className="mr-1.5 -mt-0.5 inline" />
                        Authorization
                      </SectionLabel>
                      <div className="mt-2 space-y-2">
                        <button
                          onClick={() => setOnChainMode(true)}
                          disabled={!canOnChain}
                          className="pressable flex w-full items-start gap-3 rounded-xl border p-3 text-left disabled:opacity-50"
                          style={{
                            borderColor: onChainMode ? 'var(--color-accent)' : 'var(--color-line)',
                            background: onChainMode ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)',
                          }}
                        >
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border" style={{ borderColor: onChainMode ? 'var(--color-accent)' : 'var(--color-line-strong)' }}>
                            {onChainMode && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-accent)' }} />}
                          </span>
                          <span className="flex-1">
                            <span className="flex items-center gap-1.5 text-[12.5px] font-600" style={{ color: 'var(--color-fg)' }}>
                              <Fingerprint size={13} style={{ color: 'var(--color-accent)' }} /> Register on-chain · Altana testnet
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                              {canOnChain
                                ? 'A real session key on BSC testnet, authorized by a passkey (no private key), gas sponsored by the relayer. Verifiable in the explorer.'
                                : 'Needs a passkey-capable browser (this environment has none).'}
                            </span>
                          </span>
                        </button>

                        <button
                          onClick={() => setOnChainMode(false)}
                          className="pressable flex w-full items-start gap-3 rounded-xl border p-3 text-left"
                          style={{
                            borderColor: !onChainMode ? 'var(--color-accent)' : 'var(--color-line)',
                            background: !onChainMode ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)',
                          }}
                        >
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border" style={{ borderColor: !onChainMode ? 'var(--color-accent)' : 'var(--color-line-strong)' }}>
                            {!onChainMode && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-accent)' }} />}
                          </span>
                          <span className="flex-1">
                            <span className="flex items-center gap-1.5 text-[12.5px] font-600" style={{ color: 'var(--color-fg)' }}>
                              <PenLine size={13} style={{ color: 'var(--color-muted)' }} /> Signed authorization
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                              {wallet.address
                                ? `Signed with ${shortAddr(wallet.address)} — a signature, no funds move.`
                                : 'Connect a wallet to sign, or grant as a demo. No on-chain tx.'}
                            </span>
                          </span>
                        </button>
                      </div>
                      {chainError && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-neg)' }}>
                          <AlertTriangle size={12} /> {chainError}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ---------------- GRANTING / ACTIVE ---------------- */}
                {(stage === 'granting' || stage === 'active') && (
                  <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
                    <div className="mt-6 grid place-items-center py-5 text-center">
                      <motion.div
                        className="grid h-16 w-16 place-items-center rounded-2xl"
                        style={{ background: stage === 'active' ? 'color-mix(in srgb, var(--color-pos) 16%, transparent)' : 'var(--color-surface-2)' }}
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}
                      >
                        {stage === 'granting' ? (
                          <motion.div className="h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--color-line-strong)', borderTopColor: 'var(--color-accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />
                        ) : (
                          <ShieldCheck size={30} style={{ color: 'var(--color-pos)' }} />
                        )}
                      </motion.div>
                      <h3 className="mt-4 font-display text-[17px] font-600" style={{ color: 'var(--color-fg)' }}>
                        {stage === 'granting' ? (signing ? 'Waiting for your signature…' : 'Registering session…') : `${agent.name} is hired`}
                      </h3>
                      <p className="mt-1 max-w-[320px] text-[12.5px]" style={{ color: 'var(--color-muted)' }}>
                        {stage === 'granting'
                          ? chainStatus
                            ? chainStatus
                            : signing
                              ? 'Approve the authorization in your wallet. No funds move — it is a signature.'
                              : 'Writing the scoped session key to the on-chain registry.'
                          : liveSession?.onChain
                            ? 'A real session key is live on BSC testnet — enforced on-chain, revocable in one tx.'
                            : 'It can now act for you inside the limits you set — and only those.'}
                      </p>
                    </div>

                    {stage === 'active' && liveSession && (
                      <div className="space-y-2.5">
                        {liveSession.onChain && (
                          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'color-mix(in srgb, var(--color-pos) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-pos) 30%, var(--color-line))', color: 'var(--color-fg)' }}>
                            <Link2 size={14} style={{ color: 'var(--color-pos)' }} />
                            Registered on-chain · Altana · BSC testnet (chain 97)
                          </div>
                        )}
                        <SpendMeter session={liveSession} />
                        <SessionRow label={liveSession.onChain ? 'Session key (on-chain)' : 'Session key'} mono value={liveSession.sessionKey} />
                        <SessionRow label={liveSession.onChain ? 'Altana wallet' : 'Agent wallet'} mono value={liveSession.onChain ? shortAddr(liveSession.agentWallet) : liveSession.agentWallet} />
                        {liveSession.txHash ? (
                          <SessionRow label="Grant tx" mono tone="pos" value={`${liveSession.txHash.slice(0, 10)}…`} />
                        ) : liveSession.onChain ? (
                          <SessionRow label="Grant" tone="pos" value="relayed on-chain" />
                        ) : liveSession.signature ? (
                          <SessionRow label="Authorization" mono tone="pos" value={`${liveSession.signature.slice(0, 10)}… signed`} />
                        ) : (
                          <SessionRow label="Authorization" value="demo (no wallet)" />
                        )}
                        <SessionRow label="Expires in" value={countdown(liveSession.expiresAt)} />
                        <SessionRow label="Scoped calls" value={`${liveSession.calls.length} allowed`} />
                        {liveSession.onChain && liveSession.explorerUrl ? (
                          <a href={liveSession.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12.5px] font-500" style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}>
                            View transaction on BscScan <ExternalLink size={13} />
                          </a>
                        ) : (
                          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12.5px] font-500" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                            View session in Altana explorer <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* footer */}
            <div className="border-t px-6 py-4" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}>
              {stage === 'detail' && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="tabular font-display text-[18px] font-700" style={{ color: 'var(--color-fg)' }}>
                      {agent.pricePerSession} tUSDC
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--color-faint)' }}>
                      per session · via x402
                    </span>
                  </div>
                  <button onClick={() => setStage('configure')} className="pressable ml-auto rounded-xl px-6 py-3 font-display text-[14px] font-600" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
                    Hire {agent.name}
                  </button>
                </div>
              )}

              {stage === 'configure' && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setStage('detail')} className="pressable grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }} aria-label="Back">
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={grant} className="pressable flex-1 rounded-xl py-3 font-display text-[14px] font-600" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
                    {onChainMode
                      ? `Register on-chain · ${cap} cap`
                      : wallet.address
                        ? `Sign & grant · ${cap} tUSDC cap`
                        : `Grant session · ${cap} tUSDC cap`}
                  </button>
                </div>
              )}

              {stage === 'active' && (
                <button onClick={doRevoke} className="pressable flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-display text-[14px] font-600" style={{ borderColor: 'var(--color-neg)', color: 'var(--color-neg)' }}>
                  <Ban size={15} /> Revoke session
                </button>
              )}

              {stage === 'granting' && (
                <div className="py-3 text-center text-[12.5px]" style={{ color: 'var(--color-faint)' }}>
                  {signing ? 'Confirm in your wallet…' : 'Registering…'}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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

function SpendMeter({ session }: { session: Session }) {
  const pct = Math.min(100, (session.spent / session.cap) * 100)
  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <div className="mb-2 flex items-center justify-between text-[11.5px]">
        <span style={{ color: 'var(--color-faint)' }}>Spent of cap</span>
        <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>
          {session.spent.toFixed(1)} / {session.cap} tUSDC
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-surface)' }}>
        <motion.div className="h-full rounded-full" style={{ background: 'var(--color-accent)' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }} />
      </div>
      <div className="mt-1.5 text-[10.5px]" style={{ color: 'var(--color-faint)' }}>
        Cannot exceed the cap — enforced by the session, not by trust.
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>
      {children}
    </span>
  )
}

function SessionRow({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'pos' }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <span style={{ color: 'var(--color-faint)' }}>{label}</span>
      <span className={mono ? 'font-mono' : 'tabular font-500'} style={{ color: tone === 'pos' ? 'var(--color-pos)' : 'var(--color-fg)' }}>
        {value}
      </span>
    </div>
  )
}
