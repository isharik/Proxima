import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Wallet, Clock, ArrowLeft, Ban, ExternalLink, Fingerprint, PenLine, AlertTriangle, Link2, Globe, BadgeCheck, Star } from 'lucide-react'
import type { OnchainAgent, ScanDetail, AgentReview } from '../lib/onchainAgents'
import { fetchScanAgentDetail, fetchAgentReviews } from '../lib/onchainAgents'
import { buildRealAdvantage, realAdvantageMarkdown } from '../data/realAdvantage'
import { Download, Bot } from 'lucide-react'
import { ReputationRing, Dot, Chip } from './primitives'
import { useLiveNetwork } from '../lib/live'
import { fmtGwei } from '../lib/format'
import { shortAddr, type WalletState } from '../lib/wallet'
import { addSession, revokeSession, useSessions, type Session } from '../lib/sessions'
import { grantOnChain, revokeOnChain, passkeySupported, altanaError } from '../lib/altana'

type Stage = 'detail' | 'configure' | 'granting' | 'active'
type WalletApi = WalletState & { onBsc: boolean; connect: () => void; switchToBsc: () => void; signMessage: (m: string) => Promise<string | null> }

const EXPIRIES = [
  { label: '24 hours', h: 24 },
  { label: '7 days', h: 168 },
  { label: '30 days', h: 720 },
]
const rhex = (n: number) => { const h = '0123456789abcdef'; let s = ''; for (let i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)]; return s }

export default function RealAgentDrawer({ agent, onClose, wallet }: { agent: OnchainAgent | null; onClose: () => void; wallet: WalletApi }) {
  const [stage, setStage] = useState<Stage>('detail')
  const [cap, setCap] = useState(250)
  const [expiry, setExpiry] = useState(EXPIRIES[1])
  const [onChainMode, setOnChainMode] = useState(false)
  const [signing, setSigning] = useState(false)
  const [chainStatus, setChainStatus] = useState('')
  const [chainError, setChainError] = useState('')
  const { sessions } = useSessions()
  const net = useLiveNetwork()
  const canOnChain = passkeySupported()
  const [detail, setDetail] = useState<ScanDetail | null>(null)
  const [reviews, setReviews] = useState<AgentReview[]>([])

  useEffect(() => {
    setDetail(null)
    setReviews([])
    if (agent && agent.source === 'scan') {
      let alive = true
      fetchScanAgentDetail(agent.id).then((d) => alive && setDetail(d))
      if ((agent.feedbacks ?? 0) > 0) fetchAgentReviews(agent.id).then((r) => alive && setReviews(r))
      return () => {
        alive = false
      }
    }
  }, [agent])

  const sid = agent ? `oc-${agent.id}` : ''
  const liveSession = useMemo<Session | undefined>(
    () => sessions.find((s) => s.agentId === sid && !s.revoked && s.expiresAt > Date.now()),
    [sessions, sid],
  )

  useEffect(() => {
    if (agent) {
      setCap(250); setExpiry(EXPIRIES[1]); setOnChainMode(false); setChainStatus(''); setChainError('')
      const existing = sessions.find((s) => s.agentId === `oc-${agent.id}` && !s.revoked && s.expiresAt > Date.now())
      setStage(existing ? 'active' : 'detail')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (agent) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [agent, onClose])

  async function grant() {
    if (!agent) return
    setChainError('')
    const calls = ['agent.invoke', 'agent.status', ...(agent.x402 ? ['x402.pay'] : [])]
    const expiresAt = Date.now() + expiry.h * 3600 * 1000

    if (onChainMode && canOnChain) {
      setStage('granting'); setChainStatus('Approve the passkey to create your Altana wallet…')
      try {
        setChainStatus('Registering the session on BSC testnet…')
        const res = await grantOnChain({ agentName: agent.name, capUsd: cap, expiryUnix: Math.floor(expiresAt / 1000) })
        addSession({ id: sid, agentId: sid, agentName: agent.name, category: agent.category === 'other' ? 'grid' : agent.category, cap, spent: 0, calls, expiresAt, createdAt: Date.now(), sessionKey: res.publicKey.slice(0, 10) + '…' + res.publicKey.slice(-4), agentWallet: res.walletAddress, owner: res.walletAddress, signature: null, revoked: false, onChain: true, txHash: res.transactionHash, publicKey: res.publicKey, explorerUrl: res.explorerUrl })
        setChainStatus(''); setStage('active')
      } catch (e) { setChainError(altanaError(e)); setChainStatus(''); setStage('configure') }
      return
    }

    setStage('granting')
    const sessionKey = '0x' + rhex(8) + '…' + rhex(4)
    let signature: string | null = null
    if (wallet.address) {
      setSigning(true)
      signature = await wallet.signMessage(`Proxima — authorize agent session\n\nAgent: ${agent.name} (#${agent.id})\nOwner: ${wallet.address}\nSpend cap: ${cap} tUSDC\nExpires: ${new Date(expiresAt).toISOString()}\nAllowed calls: ${calls.join(', ')}`)
      setSigning(false)
      if (!signature) { setStage('configure'); return }
    }
    addSession({ id: sid, agentId: sid, agentName: agent.name, category: agent.category === 'other' ? 'grid' : agent.category, cap, spent: 0, calls, expiresAt, createdAt: Date.now(), sessionKey, agentWallet: agent.owner, owner: wallet.address, signature, revoked: false })
    window.setTimeout(() => setStage('active'), signature ? 200 : 900)
  }

  async function doRevoke() {
    if (liveSession) {
      if (liveSession.onChain && liveSession.publicKey) { setChainStatus('Revoking on-chain…'); try { await revokeOnChain(liveSession.publicKey) } catch { /* still local */ } setChainStatus('') }
      revokeSession(liveSession.id)
    }
    setStage('detail')
  }

  const calls = agent ? ['agent.invoke', 'agent.status', ...(agent.x402 ? ['x402.pay'] : [])] : []
  const advantage = useMemo(() => (agent ? buildRealAdvantage(agent, detail) : null), [agent, detail])

  function downloadReport() {
    if (!agent) return
    const md = realAdvantageMarkdown(agent, detail)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-advantage-${agent.name.replace(/\W+/g, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      {agent && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{ background: 'rgba(4,5,7,0.6)', backdropFilter: 'blur(4px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[480px] flex-col border-l" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line-strong)' }} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }} role="dialog" aria-modal="true" aria-label={`${agent.name} details`}>
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-line)' }}>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-muted)' }}>
                <span className="rounded-md px-2 py-0.5 text-[11px] font-500" style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent-soft)' }}>ERC-8004 · on-chain</span>
                <Dot live={agent.active} />{agent.active ? 'Active' : 'Idle'}
              </div>
              <button onClick={onClose} className="pressable grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-start gap-3.5">
                {agent.avatar ? (
                  <img src={agent.avatar} alt="" className="h-13 w-13 shrink-0 rounded-full object-cover" style={{ width: 52, height: 52, border: '1px solid var(--color-line-strong)' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <ReputationRing value={agent.trustScore} size={52} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-[20px] font-700" style={{ color: 'var(--color-fg)' }}>{agent.name}</h2>
                    {agent.verified && <BadgeCheck size={16} style={{ color: 'var(--color-accent)' }} />}
                  </div>
                  <p className="font-mono text-[12px]" style={{ color: 'var(--color-faint)' }}>agent #{agent.id} · owner {shortAddr(agent.owner)}</p>
                  {agent.feedbacks != null && agent.feedbacks > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--color-muted)' }}>
                      <Star size={12} style={{ color: 'var(--color-accent)' }} fill="var(--color-accent)" />
                      <span className="tabular font-600" style={{ color: 'var(--color-fg)' }}>{(agent.avgScore ?? 0).toFixed(1)}</span>
                      · {agent.feedbacks} on-chain reviews
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {stage === 'detail' && (
                  <motion.div key="d" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <p className="mt-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{agent.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {agent.x402 && <Chip>x402 payments</Chip>}
                      {agent.trust.map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>

                    {/* Agent Advantage (TermiX) — grounded in real data */}
                    {advantage && (
                      <div className="mt-5 rounded-xl border p-4" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-[12.5px] font-600" style={{ color: 'var(--color-fg)' }}>
                              <Bot size={13} style={{ color: 'var(--color-accent)' }} /> Agent advantage
                            </div>
                            <div className="text-[11.5px]" style={{ color: 'var(--color-muted)' }}>hiring it vs. doing it yourself</div>
                          </div>
                          <span className="tabular font-display text-[22px] font-700" style={{ color: 'var(--color-pos)' }}>{advantage.winPct}%</span>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {advantage.tasks.map((t, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11.5px]" style={{ color: 'var(--color-muted)' }}>
                              <span className="font-mono text-[10px]" style={{ color: 'var(--color-faint)' }}>T{i + 1}</span>
                              <span>{t.task}{t.security && <span className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-600" style={{ background: 'var(--color-surface)', color: 'var(--color-accent-soft)' }}>security</span>}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={downloadReport} className="pressable mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-[12px] font-600" style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}>
                          <Download size={13} /> Download advantage report
                        </button>
                      </div>
                    )}

                    {/* capability tags from 8004scan */}
                    {detail && detail.tags.length > 0 && (
                      <div className="mt-4">
                        <Label>Capabilities</Label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {detail.tags.map((t) => (
                            <span key={t} className="rounded-full px-2.5 py-1 text-[11px] font-500" style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent-soft)', border: '1px solid var(--color-line)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* score breakdown from 8004scan */}
                    {detail && detail.totalScore > 0 && (
                      <div className="mt-5">
                        <Label>8004scan scores</Label>
                        <div className="mt-2 space-y-2 rounded-xl border p-3" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                          {detail.scores.map((s) => (
                            <div key={s.label} className="flex items-center gap-3">
                              <span className="w-20 shrink-0 text-[11px]" style={{ color: 'var(--color-faint)' }}>{s.label}</span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-surface)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.value)}%`, background: 'var(--color-accent)' }} />
                              </div>
                              <span className="tabular w-8 text-right text-[11px] font-600" style={{ color: 'var(--color-fg)' }}>{Math.round(s.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* real endpoints from 8004scan */}
                    {detail && (detail.a2aEndpoint || detail.mcpServer || detail.agentUrl) && (
                      <div className="mt-5">
                        <Label>
                          Endpoints
                          {detail.isTermix && <span className="ml-2 rounded px-1.5 py-0.5 text-[9.5px] font-600" style={{ background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', color: 'var(--color-accent-soft)' }}>TermiX agent</span>}
                          {detail.endpointVerified && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--color-pos)' }}><ShieldCheck size={10} /> verified</span>}
                        </Label>
                        <div className="mt-2 space-y-1.5">
                          {detail.a2aEndpoint && <EndpointRow label="A2A" url={detail.a2aEndpoint} />}
                          {detail.mcpServer && <EndpointRow label="MCP" url={detail.mcpServer} />}
                          {detail.agentUrl && <EndpointRow label="Agent" url={detail.agentUrl} />}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 space-y-2.5">
                      <Field label="Category (classified)" value={agent.category === 'other' ? 'General' : agent.category} />
                      {agent.feedbacks != null && agent.feedbacks > 0 ? (
                        <Field label="Rating" pos value={`${(agent.avgScore ?? 0).toFixed(1)} / 5 · ${agent.feedbacks} reviews`} />
                      ) : (
                        <Field label={agent.source === 'scan' ? 'Reputation' : 'Trust signal'} value={agent.source === 'scan' ? 'Unrated (no feedback yet)' : `${agent.trustScore} / 100`} />
                      )}
                      {agent.verified && <Field label="Verified" pos value="on 8004scan" />}
                      {agent.rank != null && <Field label="Network rank" value={`#${agent.rank}`} />}
                      <Field label="Owner" mono value={shortAddr(agent.owner)} />
                      {agent.endpoint && <Field label="Endpoint" mono value={agent.endpoint.replace(/^https?:\/\//, '').slice(0, 28)} />}
                    </div>

                    {agent.endpoint && (
                      <a href={agent.endpoint} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12.5px] font-500" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                        <Globe size={13} /> Open agent endpoint <ExternalLink size={12} />
                      </a>
                    )}
                    {/* real reviews from 8004scan */}
                    {reviews.length > 0 && (
                      <div className="mt-5">
                        <Label>On-chain reviews</Label>
                        <div className="mt-2 space-y-2">
                          {reviews.map((rv, i) => (
                            <div key={i} className="rounded-lg border p-2.5" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                              <div className="mb-1 flex items-center justify-between">
                                <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-muted)' }}>{rv.reviewer}</span>
                                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-faint)' }}>
                                  {rv.score != null && (
                                    <span className="tabular flex items-center gap-0.5 font-600" style={{ color: 'var(--color-accent)' }}>
                                      <Star size={9} fill="var(--color-accent)" /> {rv.score}
                                    </span>
                                  )}
                                  {rv.when}
                                </span>
                              </div>
                              {rv.comment && <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{rv.comment}</p>}
                              {rv.tags.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {rv.tags.map((t) => (
                                    <span key={t} className="rounded px-1.5 py-0.5 text-[9.5px]" style={{ background: 'var(--color-surface)', color: 'var(--color-faint)' }}>{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <a href={agent.explorer} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12.5px] font-500" style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}>
                      {agent.source === 'scan' ? 'View on 8004scan' : 'View identity on BscScan'} <ExternalLink size={13} />
                    </a>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                      <ShieldCheck size={15} style={{ color: 'var(--color-pos)' }} />
                      {agent.source === 'scan'
                        ? 'Identity, reputation and verification read live via the 8004scan API (ERC-8004, BSC).'
                        : 'Identity record read live from the ERC-8004 registry on BNB Chain.'}
                    </div>
                  </motion.div>
                )}

                {stage === 'configure' && (
                  <motion.div key="c" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <div className="mt-4 rounded-xl border p-3 text-[12px] leading-relaxed" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>
                      Grant <span style={{ color: 'var(--color-fg)' }}>{agent.name}</span> a scoped session. It can only make the calls below, cannot exceed the cap, and expires on its own. Revoke any time.
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between"><Label><Wallet size={13} className="mr-1.5 -mt-0.5 inline" />Spend cap</Label><span className="tabular font-display text-[15px] font-600" style={{ color: 'var(--color-accent)' }}>{cap} <span className="text-[11px] font-400" style={{ color: 'var(--color-faint)' }}>tUSDC</span></span></div>
                      <input type="range" min={25} max={1000} step={25} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" aria-label="Spend cap" />
                    </div>
                    <div className="mt-5">
                      <Label><Clock size={13} className="mr-1.5 -mt-0.5 inline" />Session expiry</Label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {EXPIRIES.map((e) => { const on = e.h === expiry.h; return <button key={e.h} onClick={() => setExpiry(e)} className="pressable rounded-lg border py-2 text-[12.5px] font-500" style={{ borderColor: on ? 'var(--color-accent)' : 'var(--color-line)', background: on ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: on ? 'var(--color-accent-soft)' : 'var(--color-muted)' }}>{e.label}</button> })}
                      </div>
                    </div>
                    <div className="mt-5">
                      <Label>Allowed calls</Label>
                      <div className="mt-2 space-y-1.5">
                        {calls.map((c) => <div key={c} className="rounded-lg border px-3 py-2 font-mono text-[12px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}>{c}</div>)}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Live BSC gas</span>
                      <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>{net.gasGwei == null ? '—' : `${fmtGwei(net.gasGwei)} gwei`}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <button onClick={() => setOnChainMode(true)} disabled={!canOnChain} className="pressable flex w-full items-center gap-2 rounded-xl border p-3 text-left text-[12.5px] disabled:opacity-50" style={{ borderColor: onChainMode ? 'var(--color-accent)' : 'var(--color-line)', background: onChainMode ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)' }}>
                        <Fingerprint size={14} style={{ color: 'var(--color-accent)' }} /><span style={{ color: 'var(--color-fg)' }}>Register on-chain (Altana testnet, passkey)</span>
                      </button>
                      <button onClick={() => setOnChainMode(false)} className="pressable flex w-full items-center gap-2 rounded-xl border p-3 text-left text-[12.5px]" style={{ borderColor: !onChainMode ? 'var(--color-accent)' : 'var(--color-line)', background: !onChainMode ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)' }}>
                        <PenLine size={14} style={{ color: 'var(--color-muted)' }} /><span style={{ color: 'var(--color-fg)' }}>{wallet.address ? `Sign with ${shortAddr(wallet.address)}` : 'Signed / demo grant'}</span>
                      </button>
                      {chainError && <p className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--color-neg)' }}><AlertTriangle size={12} /> {chainError}</p>}
                    </div>
                  </motion.div>
                )}

                {(stage === 'granting' || stage === 'active') && (
                  <motion.div key="a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <div className="mt-6 grid place-items-center py-5 text-center">
                      <motion.div className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: stage === 'active' ? 'color-mix(in srgb, var(--color-pos) 16%, transparent)' : 'var(--color-surface-2)' }} initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}>
                        {stage === 'granting' ? <motion.div className="h-6 w-6 rounded-full border-2" style={{ borderColor: 'var(--color-line-strong)', borderTopColor: 'var(--color-accent)' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} /> : <ShieldCheck size={30} style={{ color: 'var(--color-pos)' }} />}
                      </motion.div>
                      <h3 className="mt-4 font-display text-[17px] font-600" style={{ color: 'var(--color-fg)' }}>{stage === 'granting' ? (chainStatus || (signing ? 'Waiting for signature…' : 'Registering…')) : `${agent.name} is hired`}</h3>
                    </div>
                    {stage === 'active' && liveSession && (
                      <div className="space-y-2.5">
                        {liveSession.onChain && <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px]" style={{ background: 'color-mix(in srgb, var(--color-pos) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-pos) 30%, var(--color-line))', color: 'var(--color-fg)' }}><Link2 size={14} style={{ color: 'var(--color-pos)' }} /> Registered on-chain · Altana · BSC testnet</div>}
                        <Field label="Session key" mono value={liveSession.sessionKey} />
                        <Field label="Spend cap" value={`${liveSession.cap} tUSDC`} />
                        {liveSession.txHash ? <Field label="Grant tx" mono pos value={`${liveSession.txHash.slice(0, 10)}…`} /> : liveSession.signature ? <Field label="Authorization" mono pos value={`${liveSession.signature.slice(0, 10)}… signed`} /> : <Field label="Authorization" value="demo grant" />}
                        <Field label="Expires in" value={countdown(liveSession.expiresAt)} />
                        {liveSession.onChain && liveSession.explorerUrl && <a href={liveSession.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[12.5px] font-500" style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-accent)' }}>View transaction on BscScan <ExternalLink size={13} /></a>}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t px-6 py-4" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}>
              {stage === 'detail' && <button onClick={() => setStage('configure')} className="pressable w-full rounded-xl py-3 font-display text-[14px] font-600" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>Hire {agent.name}</button>}
              {stage === 'configure' && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setStage('detail')} className="pressable grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }} aria-label="Back"><ArrowLeft size={16} /></button>
                  <button onClick={grant} className="pressable flex-1 rounded-xl py-3 font-display text-[14px] font-600" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>{onChainMode ? `Register on-chain · ${cap} cap` : wallet.address ? `Sign & grant · ${cap} cap` : `Grant session · ${cap} cap`}</button>
                </div>
              )}
              {stage === 'active' && <button onClick={doRevoke} className="pressable flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-display text-[14px] font-600" style={{ borderColor: 'var(--color-neg)', color: 'var(--color-neg)' }}><Ban size={15} /> Revoke session</button>}
              {stage === 'granting' && <div className="py-3 text-center text-[12.5px]" style={{ color: 'var(--color-faint)' }}>{signing ? 'Confirm in your wallet…' : 'Registering…'}</div>}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function countdown(ts: number): string { const ms = ts - Date.now(); if (ms <= 0) return 'expired'; const h = Math.floor(ms / 3600000); if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`; const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m` }
function Label({ children }: { children: React.ReactNode }) { return <span className="text-[11px] font-600 uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>{children}</span> }
function Field({ label, value, mono, pos }: { label: string; value: string; mono?: boolean; pos?: boolean }) {
  return <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}><span style={{ color: 'var(--color-faint)' }}>{label}</span><span className={mono ? 'font-mono' : 'tabular font-500'} style={{ color: pos ? 'var(--color-pos)' : 'var(--color-fg)' }}>{value}</span></div>
}
function EndpointRow({ label, url }: { label: string; url: string }) {
  let host = url
  try { host = new URL(url).host } catch { /* keep raw */ }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border px-3 py-2 text-[11.5px]" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-line)' }}>
      <span className="flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px] font-600" style={{ background: 'var(--color-surface)', color: 'var(--color-accent-soft)' }}>{label}</span>
        <span className="font-mono" style={{ color: 'var(--color-muted)' }}>{host}</span>
      </span>
      <ExternalLink size={12} style={{ color: 'var(--color-faint)' }} />
    </a>
  )
}
