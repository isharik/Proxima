import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { CATEGORIES, categoryMeta, type Agent, type Category } from '../data/agents'

type Item =
  | { kind: 'agent'; agent: Agent }
  | { kind: 'category'; id: Category; label: string; blurb: string }

export default function CommandPalette({
  open,
  onClose,
  agents,
  onSelectAgent,
  onSelectCategory,
}: {
  open: boolean
  onClose: () => void
  agents: Agent[]
  onSelectAgent: (a: Agent) => void
  onSelectCategory: (c: Category) => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase()
    const cats: Item[] = CATEGORIES.map((c) => ({
      kind: 'category',
      id: c.id,
      label: c.label,
      blurb: c.blurb,
    }))
    const ag: Item[] = agents.map((a) => ({ kind: 'agent', agent: a }))
    let all = [...cats, ...ag]
    if (query) {
      all = all.filter((it) => {
        if (it.kind === 'category') return (it.label + ' ' + it.blurb).toLowerCase().includes(query)
        const a = it.agent
        return [a.name, a.handle, a.tagline, a.category, ...a.protocols].join(' ').toLowerCase().includes(query)
      })
    }
    return all.slice(0, 8)
  }, [q, agents])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => setActive(0), [q])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, items.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        choose(items[active])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, active])

  function choose(it: Item | undefined) {
    if (!it) return
    if (it.kind === 'agent') onSelectAgent(it.agent)
    else onSelectCategory(it.id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(4,5,7,0.62)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-[18vh] z-[61] w-[min(92vw,560px)] -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div
              className="overflow-hidden rounded-2xl border shadow-2xl"
              style={{ background: 'var(--color-elevated)', borderColor: 'var(--color-line-strong)' }}
            >
              <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-line)' }}>
                <Search size={17} style={{ color: 'var(--color-faint)' }} />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search agents and categories…"
                  className="flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[var(--color-faint)]"
                  style={{ color: 'var(--color-fg)' }}
                />
                <kbd
                  className="rounded-md border px-1.5 py-0.5 text-[10px] font-600"
                  style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-faint)' }}
                >
                  ESC
                </kbd>
              </div>

              <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
                {items.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[13px]" style={{ color: 'var(--color-faint)' }}>
                    No matches for “{q}”.
                  </div>
                ) : (
                  items.map((it, i) => {
                    const on = i === active
                    const key = it.kind === 'agent' ? it.agent.id : it.id
                    return (
                      <button
                        key={key}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(it)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                        style={{ background: on ? 'var(--color-surface-2)' : 'transparent' }}
                      >
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-700"
                          style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-line)',
                            color: it.kind === 'agent' ? 'var(--color-accent)' : 'var(--color-muted)',
                          }}
                        >
                          {it.kind === 'agent' ? it.agent.reputation : '#'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13.5px] font-600" style={{ color: 'var(--color-fg)' }}>
                              {it.kind === 'agent' ? it.agent.name : it.label}
                            </span>
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-500"
                              style={{ background: 'var(--color-surface)', color: 'var(--color-faint)' }}
                            >
                              {it.kind === 'agent' ? categoryMeta(it.agent.category).label : 'Category'}
                            </span>
                          </div>
                          <div className="truncate text-[12px]" style={{ color: 'var(--color-faint)' }}>
                            {it.kind === 'agent' ? it.agent.tagline : it.blurb}
                          </div>
                        </div>
                        {on && <CornerDownLeft size={14} style={{ color: 'var(--color-faint)' }} />}
                      </button>
                    )
                  })
                )}
              </div>

              <div
                className="flex items-center gap-4 border-t px-4 py-2.5 text-[11px]"
                style={{ borderColor: 'var(--color-line)', color: 'var(--color-faint)' }}
              >
                <span className="inline-flex items-center gap-1">
                  <ArrowUp size={11} />
                  <ArrowDown size={11} /> navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft size={11} /> open
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
