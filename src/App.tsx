import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import KineticGrid from './components/KineticGrid'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AgentCard from './components/AgentCard'
import AgentCardSkeleton from './components/AgentCardSkeleton'
import HireDrawer from './components/HireDrawer'
import CommandPalette from './components/CommandPalette'
import ListAgentModal from './components/ListAgentModal'
import MyAgentsDrawer from './components/MyAgentsDrawer'
import CompareTray from './components/CompareTray'
import RealAgentCard from './components/RealAgentCard'
import RealAgentDrawer from './components/RealAgentDrawer'
import AgentCardSkeletonReal from './components/AgentCardSkeleton'
import {
  useOnchainAgents,
  fetchScanAgentsByCategory,
  filterAgentsByCategory,
  sortLiveAgents,
  type OnchainAgent,
  type LiveCategory,
  type LiveSort,
} from './lib/onchainAgents'
import { HowItWorks, ClosingCTA, Footer } from './components/Sections'
import { CATEGORIES, type Agent, type Category } from './data/agents'
import { useAgents } from './lib/agentsSource'
import { useWallet } from './lib/wallet'

type Filter = 'all' | Category
type Sort = 'reputation' | 'hires' | 'price' | 'reviews' | 'verified'

// The reference set has invented per-session prices and hire counts.
// The live registry doesn't — so live agents sort by the real on-chain
// dimensions we actually have (reputation, review count, verification).
const REF_SORTS: { id: Sort; label: string }[] = [
  { id: 'reputation', label: 'Reputation' },
  { id: 'hires', label: 'Most hired' },
  { id: 'price', label: 'Lowest price' },
]
const LIVE_SORTS: { id: Sort; label: string }[] = [
  { id: 'reputation', label: 'Reputation' },
  { id: 'reviews', label: 'Most reviewed' },
  { id: 'verified', label: 'Verified first' },
]

const ease = [0.23, 1, 0.32, 1] as const

// Capture the launch hash at module load — before React mounts or any
// in-app anchor scroll can rewrite it — so shared deep links survive.
const BOOT_HASH =
  typeof window !== 'undefined' && /(?:^|[#&])(?:cat|agent)=/.test(window.location.hash)
    ? window.location.hash
    : ''

export default function App() {
  const { agents, status } = useAgents()
  const onchain = useOnchainAgents()
  const wallet = useWallet()
  const [dataMode, setDataMode] = useState<'live' | 'reference'>('live')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('reputation')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Agent | null>(null)
  const [activeReal, setActiveReal] = useState<OnchainAgent | null>(null)
  const [catAgents, setCatAgents] = useState<OnchainAgent[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [myAgentsOpen, setMyAgentsOpen] = useState(false)
  const browseRef = useRef<HTMLDivElement>(null)

  // global ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // deep-linking: capture the boot hash once, apply it after agents
  // load, then keep the URL in sync (writer stays off until hydrated so
  // it can't clobber the incoming hash).
  const hydrated = useRef(false)

  useEffect(() => {
    if (agents.length === 0 || hydrated.current) return
    const hash = new URLSearchParams(BOOT_HASH.replace(/^#/, ''))
    const cat = hash.get('cat') as Filter | null
    const ag = hash.get('agent')
    if (cat && (cat === 'all' || CATEGORIES.some((c) => c.id === cat))) setFilter(cat)
    if (ag) {
      const found = agents.find((a) => a.id === ag)
      if (found) setActive(found)
    }
    hydrated.current = true
  }, [agents])

  useEffect(() => {
    if (!hydrated.current) return
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('cat', filter)
    if (active) params.set('agent', active.id)
    const str = params.toString()
    const wantHash = str ? `#${str}` : ''
    if (window.location.hash !== wantHash) {
      history.replaceState(null, '', str ? `#${str}` : window.location.pathname + window.location.search)
    }
  }, [filter, active])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = agents.filter((a) => filter === 'all' || a.category === filter)
    if (q) {
      list = list.filter((a) =>
        [a.name, a.handle, a.tagline, a.description, a.category, ...a.protocols].join(' ').toLowerCase().includes(q),
      )
    }
    list = [...list].sort((a, b) => {
      if (sort === 'reputation') return b.reputation - a.reputation
      if (sort === 'hires') return b.hires - a.hires
      return a.pricePerSession - b.pricePerSession
    })
    return list
  }, [agents, filter, sort, query])

  // when a category is selected in live mode, pull real category agents
  // from 8004scan's semantic search (deep, relevant) instead of filtering
  // the score-sorted "all" list.
  useEffect(() => {
    if (dataMode !== 'live' || filter === 'all') {
      setCatAgents([])
      return
    }
    let alive = true
    setCatLoading(true)
    const cat = filter as Exclude<LiveCategory, 'other'>
    ;(async () => {
      // Prefer 8004scan semantic search. When it's unavailable (the Free
      // tier throws transient DB errors), fall back to the agents already
      // loaded for "All", filtered to this category — so the tab is never
      // empty when relevant agents exist.
      let list = await fetchScanAgentsByCategory(cat).catch(() => [] as OnchainAgent[])
      if (list.length === 0) list = filterAgentsByCategory(onchain.agents, cat)
      if (alive) {
        setCatAgents(list)
        setCatLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [dataMode, filter, onchain.agents])

  const filteredReal = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = filter === 'all' ? onchain.agents : catAgents
    if (q) list = list.filter((a) => `${a.name} ${a.description} ${a.category} ${a.owner}`.toLowerCase().includes(q))
    const liveSort: LiveSort = sort === 'reviews' || sort === 'verified' ? sort : 'reputation'
    return sortLiveAgents(list, liveSort)
  }, [onchain.agents, catAgents, filter, query, sort])

  const counts = useMemo(() => {
    if (dataMode === 'live') {
      // categories are fetched on demand, so only the "all" count is known
      // up front; category counts are left undefined (hidden on the tab).
      const m: Record<string, number | undefined> = { all: onchain.agents.length }
      return m
    }
    const m: Record<string, number | undefined> = { all: agents.length }
    for (const c of CATEGORIES) m[c.id] = agents.filter((a) => a.category === c.id).length
    return m
  }, [agents, onchain.agents, dataMode])

  const totals = useMemo(
    () => ({
      hires: agents.reduce((s, a) => s + a.hires, 0),
      reviews: agents.reduce((s, a) => s + a.reviews, 0),
    }),
    [agents],
  )

  function scrollToBrowse() {
    browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const loading = status === 'loading'

  return (
    <div id="top" className="relative min-h-[100dvh]">
      <KineticGrid />
      <Navbar
        onOpenPalette={() => setPaletteOpen(true)}
        onListAgent={() => setListOpen(true)}
        onOpenMyAgents={() => setMyAgentsOpen(true)}
        wallet={wallet}
      />

      <main className="relative">
        <Hero
          query={query}
          setQuery={setQuery}
          onSearchEnter={scrollToBrowse}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        {/* ---------------- browse ---------------- */}
        <section id="browse" ref={browseRef} className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 pb-8">
          {/* section header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[24px] font-700 tracking-tight" style={{ color: 'var(--color-fg)' }}>
                Browse agents
              </h2>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted)' }}>
                {dataMode === 'live' ? (
                  onchain.status === 'loading' ? (
                    'Reading the ERC-8004 registry on BNB Chain…'
                  ) : onchain.status === 'error' ? (
                    'Registry RPC unreachable — switch to the reference set below.'
                  ) : (
                    <>
                      <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>{onchain.agents.length}</span> live agents ·{' '}
                      {onchain.source === 'scan' ? 'via the 8004scan API (ERC-8004)' : 'read from the registry contract'}
                    </>
                  )
                ) : loading ? (
                  'Loading agents…'
                ) : (
                  <>
                    <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>{agents.length}</span> reference agents ·{' '}
                    <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>{(totals.hires / 1000).toFixed(1)}k</span> hires ·{' '}
                    <span className="tabular font-500" style={{ color: 'var(--color-fg)' }}>{totals.reviews}</span> reviews
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}>
              {([
                { id: 'live', label: 'Live registry' },
                { id: 'reference', label: 'Reference set' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setDataMode(m.id)
                    setFilter('all')
                    setSort('reputation')
                  }}
                  className="pressable rounded-md px-3 py-1.5 text-[12px] font-500"
                  style={{
                    color: dataMode === m.id ? 'var(--color-on-accent)' : 'var(--color-muted)',
                    background: dataMode === m.id ? 'var(--color-accent)' : 'transparent',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* filter bar */}
          <div
            className="sticky top-[68px] z-20 -mx-2 mb-8 rounded-2xl border px-2.5 py-2.5 backdrop-blur"
            style={{ background: 'color-mix(in srgb, var(--color-bg) 82%, transparent)', borderColor: 'var(--color-line)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
              {CATEGORIES.map((c) => (
                <FilterTab
                  key={c.id}
                  active={filter === c.id}
                  onClick={() => setFilter(c.id)}
                  label={c.label}
                  count={counts[c.id]}
                />
              ))}
              <div className="ml-auto flex items-center gap-1.5 pr-1">
                <span className="hidden text-[12px] sm:inline" style={{ color: 'var(--color-faint)' }}>Sort</span>
                {(dataMode === 'live' ? LIVE_SORTS : REF_SORTS).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className="pressable rounded-lg px-2.5 py-1.5 text-[12.5px] font-500"
                    style={{
                      color: sort === s.id ? 'var(--color-fg)' : 'var(--color-faint)',
                      background: sort === s.id ? 'var(--color-surface-2)' : 'transparent',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {filter !== 'all' && (
                <motion.p
                  key={filter}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease }}
                  className="overflow-hidden px-1.5 pt-2 text-[12.5px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {CATEGORIES.find((c) => c.id === filter)?.blurb}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* grid / states */}
          {dataMode === 'live' ? (
            (filter === 'all' && onchain.status === 'loading') || (filter !== 'all' && catLoading) ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AgentCardSkeletonReal key={i} />
                ))}
              </div>
            ) : onchain.status === 'error' && filter === 'all' ? (
              <div className="grid place-items-center rounded-2xl border py-16 text-center" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}>
                <p className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>Couldn't reach the BNB Chain RPC.</p>
                <button onClick={() => setDataMode('reference')} className="mt-2 text-[13px] underline underline-offset-2" style={{ color: 'var(--color-accent)' }}>
                  Show the reference set instead
                </button>
              </div>
            ) : filteredReal.length > 0 ? (
              <>
                <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {filteredReal.map((a) => (
                      <RealAgentCard key={a.id} agent={a} onOpen={setActiveReal} />
                    ))}
                  </AnimatePresence>
                </motion.div>
                {filter === 'all' && !query && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={onchain.loadMore}
                      disabled={onchain.loadingMore}
                      className="pressable rounded-xl border px-5 py-2.5 text-[13px] font-500 disabled:opacity-60"
                      style={{ borderColor: 'var(--color-line-strong)', color: 'var(--color-fg)' }}
                    >
                      {onchain.loadingMore ? 'Scanning the registry…' : 'Load more from the chain'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="grid place-items-center rounded-2xl border py-16 text-center" style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}>
                <p className="font-display text-[15px] font-600" style={{ color: 'var(--color-fg)' }}>No live agents in this category yet.</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted)' }}>Most on-chain agents are general-purpose. Try “All”, or load more.</p>
              </div>
            )
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <AgentCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((a) => (
                  <AgentCard key={a.id} agent={a} onOpen={setActive} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div
              className="grid place-items-center rounded-2xl border py-20 text-center"
              style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}
            >
              <div
                className="mb-3 grid h-11 w-11 place-items-center rounded-xl"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-line)' }}
              >
                <Zap size={18} style={{ color: 'var(--color-faint)' }} />
              </div>
              <p className="font-display text-[16px] font-600" style={{ color: 'var(--color-fg)' }}>
                No agents match {query ? `“${query}”` : 'this filter'}.
              </p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--color-muted)' }}>
                Try a broader term, or{' '}
                <button
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                  className="underline underline-offset-2"
                  style={{ color: 'var(--color-accent)' }}
                >
                  clear filters
                </button>
                .
              </p>
            </div>
          )}
        </section>

        <HowItWorks />
        <ClosingCTA onListAgent={() => setListOpen(true)} />
        <Footer />
      </main>

      <HireDrawer agent={active} onClose={() => setActive(null)} wallet={wallet} />
      <RealAgentDrawer agent={activeReal} onClose={() => setActiveReal(null)} wallet={wallet} />
      <MyAgentsDrawer open={myAgentsOpen} onClose={() => setMyAgentsOpen(false)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        agents={agents}
        onSelectAgent={(a) => setActive(a)}
        onSelectCategory={(c) => {
          setFilter(c)
          scrollToBrowse()
        }}
      />
      <ListAgentModal open={listOpen} onClose={() => setListOpen(false)} />
      <CompareTray onHire={(a) => setActive(a)} />
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className="pressable relative rounded-lg px-3 py-1.5 text-[13px] font-500"
      style={{ color: active ? 'var(--color-on-accent)' : 'var(--color-muted)' }}
    >
      {active && (
        <motion.span
          layoutId="filter-pill"
          className="absolute inset-0 rounded-lg"
          style={{ background: 'var(--color-accent)' }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
        />
      )}
      <span className="relative z-10">
        {label}
        {count != null && <span className="tabular ml-1.5 opacity-60">{count}</span>}
      </span>
    </button>
  )
}
