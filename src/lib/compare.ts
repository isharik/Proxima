import { useEffect, useState } from 'react'

// ------------------------------------------------------------------
//  Compare tray — a small shared store of agent ids the user has
//  picked to compare side by side (max 3). Module-level so every
//  component sees the same selection, mirroring the sessions store.
// ------------------------------------------------------------------

export const MAX_COMPARE = 3

let ids: string[] = []
const subs = new Set<(v: string[]) => void>()
function emit() {
  subs.forEach((fn) => fn(ids))
}

export function toggleCompare(id: string) {
  if (ids.includes(id)) ids = ids.filter((x) => x !== id)
  else if (ids.length < MAX_COMPARE) ids = [...ids, id]
  emit()
}
export function removeCompare(id: string) {
  ids = ids.filter((x) => x !== id)
  emit()
}
export function clearCompare() {
  ids = []
  emit()
}
/** Current selection — used by tests and non-React callers. */
export function getCompareIds(): string[] {
  return [...ids]
}

export function useCompare() {
  const [list, setList] = useState<string[]>(ids)
  useEffect(() => {
    const fn = (v: string[]) => setList([...v])
    subs.add(fn)
    return () => {
      subs.delete(fn)
    }
  }, [])
  return {
    ids: list,
    has: (id: string) => list.includes(id),
    full: list.length >= MAX_COMPARE,
    count: list.length,
  }
}
