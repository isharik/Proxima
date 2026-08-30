import { useCallback, useEffect, useState } from 'react'

// ------------------------------------------------------------------
//  Active hire sessions — the lifecycle store. Persisted to
//  localStorage so a hired agent survives reload. Each session
//  records the scoped grant (cap / expiry / calls), the agent wallet,
//  and — when a wallet is connected — the real personal_sign
//  signature that authorized it. Spend accrues a little over time to
//  make the "remaining allowance" feel live.
// ------------------------------------------------------------------

export interface Session {
  id: string
  agentId: string
  agentName: string
  category: string
  cap: number
  spent: number
  calls: string[]
  expiresAt: number
  createdAt: number
  sessionKey: string
  agentWallet: string
  owner: string | null // connected wallet address, if any
  signature: string | null
  revoked: boolean
  // on-chain (Altana testnet) provenance, when registered on-chain
  onChain?: boolean
  txHash?: string
  publicKey?: string
  explorerUrl?: string
}

const KEY = 'proxima.sessions.v1'

function load(): Session[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session[]) : []
  } catch {
    return []
  }
}
function save(list: Session[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage blocked — session lives for this tab only */
  }
}

// module-level so every hook instance shares one source of truth
let store: Session[] = load()
const subs = new Set<(s: Session[]) => void>()
function emit() {
  save(store)
  subs.forEach((fn) => fn(store))
}

export function addSession(s: Session) {
  store = [s, ...store.filter((x) => x.id !== s.id)]
  emit()
}
export function revokeSession(id: string) {
  store = store.map((s) => (s.id === id ? { ...s, revoked: true } : s))
  emit()
}
export function removeSession(id: string) {
  store = store.filter((s) => s.id !== id)
  emit()
}
export function activeSessionFor(agentId: string): Session | undefined {
  return store.find((s) => s.agentId === agentId && !s.revoked && s.expiresAt > Date.now())
}

export function useSessions() {
  const [list, setList] = useState<Session[]>(store)
  useEffect(() => {
    const fn = (s: Session[]) => setList([...s])
    subs.add(fn)
    return () => {
      subs.delete(fn)
    }
  }, [])

  // gently accrue simulated spend + tick for countdowns
  useEffect(() => {
    const t = window.setInterval(() => {
      let changed = false
      store = store.map((s) => {
        if (s.revoked || s.expiresAt < Date.now()) return s
        // creep toward ~30% of cap over the session, never exceeding it
        const target = s.cap * 0.3
        if (s.spent < target) {
          changed = true
          return { ...s, spent: Math.min(target, s.spent + s.cap * 0.0009) }
        }
        return s
      })
      if (changed) emit()
      else setList([...store]) // still re-render for countdowns
    }, 3000)
    return () => window.clearInterval(t)
  }, [])

  const active = list.filter((s) => !s.revoked && s.expiresAt > Date.now())
  return { sessions: list, active }
}

export const sessions = { addSession, revokeSession, removeSession, activeSessionFor }
