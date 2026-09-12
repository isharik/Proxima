import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { OnchainAgent } from './onchainAgents'

// ------------------------------------------------------------------
//  Live-agent comparison. Pick up to three real agents and see their
//  on-chain records side by side before deciding who to hire. Kept in
//  its own context so cards anywhere can add/remove without threading
//  state through the whole tree.
// ------------------------------------------------------------------

const MAX = 3

interface CompareApi {
  items: OnchainAgent[]
  has: (id: number) => boolean
  toggle: (a: OnchainAgent) => void
  remove: (id: number) => void
  clear: () => void
  full: boolean
}

const Ctx = createContext<CompareApi | null>(null)

export function LiveCompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OnchainAgent[]>([])

  const toggle = useCallback((a: OnchainAgent) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === a.id)) return prev.filter((p) => p.id !== a.id)
      if (prev.length >= MAX) return prev
      return [...prev, a]
    })
  }, [])

  const remove = useCallback((id: number) => setItems((prev) => prev.filter((p) => p.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const api = useMemo<CompareApi>(
    () => ({
      items,
      has: (id) => items.some((p) => p.id === id),
      toggle,
      remove,
      clear,
      full: items.length >= MAX,
    }),
    [items, toggle, remove, clear],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useLiveCompare() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLiveCompare must be used inside LiveCompareProvider')
  return ctx
}
