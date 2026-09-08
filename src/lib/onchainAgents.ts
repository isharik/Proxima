import { useCallback, useEffect, useState } from 'react'
import type { Category } from '../data/agents'

// ------------------------------------------------------------------
//  Live ERC-8004 agents, read straight from the on-chain identity
//  registry on BNB Chain via the public RPC — no API key. The registry
//  is a plain ERC-721 whose tokenURI is the agent's identity record.
//  We read a batch by id, decode the embedded record (base64 JSON or
//  gzip'd base64), drop the obvious spam, classify each agent into a
//  marketplace category from its record, and derive a trust signal
//  from real on-chain fields. This is the real BSC agent inventory.
// ------------------------------------------------------------------

const RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
]
export const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
export const REGISTRY_EXPLORER = `https://bscscan.com/token/${REGISTRY}`

export type LiveCategory = Category | 'other'

export interface OnchainAgent {
  id: number
  name: string
  description: string
  owner: string
  active: boolean
  x402: boolean
  trust: string[]
  services: string[]
  endpoint?: string
  image?: string
  category: LiveCategory
  trustScore: number // 0–100, derived from real on-chain signals
  explorer: string
  // present when sourced from the 8004scan API (real reputation)
  source?: 'scan' | 'chain'
  verified?: boolean
  avatar?: string
  avgScore?: number // 0–5 stars
  feedbacks?: number
  rank?: number | null
}

async function rpc(data: string): Promise<string | null> {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: REGISTRY, data }, 'latest'], id: 1 }),
      })
      const j = await r.json()
      if (j?.result) return j.result as string
    } catch {
      /* next rpc */
    }
  }
  return null
}

const hexId = (id: number) => id.toString(16).padStart(64, '0')

function decodeAbiString(raw: string | null): string | null {
  if (!raw || raw.length < 130) return null
  try {
    const len = parseInt(raw.slice(66, 130), 16)
    const hex = raw.slice(130, 130 + len * 2)
    return decodeURIComponent(hex.replace(/(..)/g, '%$1'))
  } catch {
    return null
  }
}

async function decodeUri(uri: string): Promise<Record<string, unknown> | null> {
  try {
    if (uri.startsWith('data:application/json;base64,')) return JSON.parse(atob(uri.split(',')[1]))
    if (/enc=gzip/.test(uri) && 'DecompressionStream' in window) {
      const b64 = uri.split('base64,')[1]
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const ds = new (window as unknown as { DecompressionStream: typeof DecompressionStream }).DecompressionStream('gzip')
      const text = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text()
      return JSON.parse(text)
    }
  } catch {
    /* malformed */
  }
  return null
}

function looksLikeSpam(name: string, desc: string): boolean {
  if (!name || name.length > 42) return true
  if (!desc || desc.length < 16) return true
  const compact = desc.replace(/\s+/g, '')
  for (let n = 3; n <= 8; n++) {
    const chunk = compact.slice(0, n)
    if (chunk && compact.startsWith(chunk.repeat(Math.min(6, Math.floor(compact.length / n))))) return true
  }
  const words = desc.trim().split(/\s+/)
  const unique = new Set(words.map((w) => w.toLowerCase()))
  if (words.length >= 6 && unique.size <= 2) return true
  return false
}

// Classify a real agent into a marketplace category from its record.
const RULES: { cat: LiveCategory; re: RegExp }[] = [
  { cat: 'health', re: /liquidat|health.?factor|collateral|loan|lending|borrow|debt/i },
  { cat: 'grid', re: /grid|market.?mak|spread|arbitrage|scalp/i },
  { cat: 'yield', re: /yield|apr|apy|farm|stake|staking|vault|compound|lp reward/i },
  { cat: 'rebalancing', re: /rebalanc|liquidity range|concentrated liquidity|lp position|in.?range|clmm/i },
]
function classify(name: string, desc: string): LiveCategory {
  const text = `${name} ${desc}`
  for (const r of RULES) if (r.re.test(text)) return r.cat
  return 'other'
}

// A trust signal built only from real on-chain fields. Not a fabricated
// reputation — it reflects how complete and capable the identity record is.
function trustSignal(rec: {
  active: boolean
  x402: boolean
  trust: string[]
  services: string[]
  descLen: number
  hasImage: boolean
  hasEndpoint: boolean
}): number {
  let s = 40
  if (rec.active) s += 10
  if (rec.x402) s += 14
  s += Math.min(18, rec.trust.length * 6)
  if (rec.services.length) s += Math.min(8, rec.services.length * 2)
  if (rec.hasEndpoint) s += 6
  if (rec.hasImage) s += 4
  if (rec.descLen > 120) s += 4
  return Math.max(0, Math.min(99, s))
}

async function fetchOne(id: number): Promise<OnchainAgent | null> {
  const owner = await rpc('0x6352211e' + hexId(id)) // ownerOf
  if (!owner || /^0x0+$/.test(owner)) return null
  const uriRaw = await rpc('0xc87b56dd' + hexId(id)) // tokenURI
  const uri = decodeAbiString(uriRaw)
  if (!uri || !uri.startsWith('data:')) return null
  const rec = await decodeUri(uri)
  if (!rec) return null

  const name = String(rec.name ?? '').trim()
  const description = String(rec.description ?? '').trim()
  if (looksLikeSpam(name, description)) return null

  const active = rec.active !== false
  const x402 = !!(rec.x402Support ?? rec.x402support ?? rec.x402)
  const trust = Array.isArray(rec.supportedTrust)
    ? (rec.supportedTrust as string[])
    : Array.isArray(rec.supportedTrusts)
      ? (rec.supportedTrusts as string[])
      : []
  const servicesRaw = (rec.services ?? rec.registrations ?? []) as unknown[]
  const services = Array.isArray(servicesRaw)
    ? servicesRaw.map((s) => (typeof s === 'string' ? s : (s as { name?: string })?.name ?? '')).filter(Boolean)
    : []
  const endpoints = rec.endpoints ?? rec.endpoint
  const endpoint = typeof endpoints === 'string' && /^https?:/.test(endpoints) ? endpoints : undefined
  const image = typeof rec.image === 'string' && /^https?:/.test(rec.image) ? rec.image : undefined

  return {
    id,
    name,
    description: description.length > 220 ? description.slice(0, 217) + '…' : description,
    owner: '0x' + owner.slice(-40),
    active,
    x402,
    trust,
    services,
    endpoint,
    image,
    category: classify(name, description),
    trustScore: trustSignal({ active, x402, trust, services, descLen: description.length, hasImage: !!image, hasEndpoint: !!endpoint }),
    explorer: `https://bscscan.com/nft/${REGISTRY}/${id}`,
  }
}

export async function fetchOnchainAgents(fromId = 0, scanIds = 80, want = 24): Promise<OnchainAgent[]> {
  const ids = Array.from({ length: scanIds }, (_, i) => fromId + i)
  const settled = await Promise.all(ids.map(fetchOne))
  return settled.filter((a): a is OnchainAgent => !!a).slice(0, want)
}

// ---- 8004scan API (via the same-origin proxy) — richer, with real
//      reputation, verification and rank. This is the discovery layer
//      the AltLayer / 8004scan track is built around.
interface ScanItem {
  agent_id?: string
  token_id?: string | number
  name?: string
  description?: string
  owner_address?: string
  image_url?: string
  is_verified?: boolean
  x402_supported?: boolean
  supported_protocols?: string[]
  average_score?: number
  star_count?: number
  total_feedbacks?: number
  health_score?: number | null
  rank?: number | null
}

function scanToAgent(a: ScanItem): OnchainAgent | null {
  const id = a.token_id != null ? Number(a.token_id) : NaN
  const name = String(a.name ?? '').trim()
  const description = String(a.description ?? '').trim()
  if (!Number.isFinite(id) || looksLikeSpam(name, description)) return null
  const feedbacks = a.total_feedbacks ?? 0
  const avgScore = a.average_score ?? 0
  const x402 = !!a.x402_supported
  const verified = !!a.is_verified
  const protocols = Array.isArray(a.supported_protocols) ? a.supported_protocols : []
  // real reputation when it exists; otherwise a completeness signal
  const trustScore =
    feedbacks > 0
      ? Math.round(avgScore * 20)
      : Math.min(96, 42 + (verified ? 14 : 0) + (x402 ? 12 : 0) + Math.min(16, protocols.length * 5) + (a.image_url ? 4 : 0))
  return {
    id,
    name,
    description: description.length > 220 ? description.slice(0, 217) + '…' : description,
    owner: a.owner_address ?? '0x0000000000000000000000000000000000000000',
    active: true,
    x402,
    trust: protocols,
    services: [],
    image: a.image_url && /^https?:/.test(a.image_url) ? a.image_url : undefined,
    category: classify(name, description),
    trustScore,
    explorer: `https://8004scan.io/agents/56/${id}`,
    source: 'scan',
    verified,
    avatar: a.image_url && /^https?:/.test(a.image_url) ? a.image_url : undefined,
    avgScore,
    feedbacks,
    rank: a.rank ?? null,
  }
}

// Rich per-agent detail from the 8004scan API (needs the key, injected by
// the proxy). Real endpoints, capability tags, verification, and the full
// score breakdown.
export interface ScanDetail {
  tags: string[]
  categories: string[]
  agentUrl?: string
  a2aEndpoint?: string
  mcpServer?: string
  endpointVerified: boolean
  endpointDomain?: string
  scores: { label: string; value: number }[]
  totalScore: number
  watchCount: number
  validations: number
  successfulValidations: number
  publisherTier?: string
  healthStatus?: string
  agentWallet?: string
  isTermix: boolean
}

function cleanUrl(v: unknown): string | undefined {
  return typeof v === 'string' && /^https?:\/\//.test(v) ? v : undefined
}

export async function fetchScanAgentDetail(id: number): Promise<ScanDetail | null> {
  try {
    const r = await fetch(`/8004/agents/56/${id}`)
    if (!r.ok) return null
    const d = (await r.json()) as Record<string, unknown>
    const a2a = cleanUrl(d.a2a_endpoint)
    const scoreDefs: [string, unknown][] = [
      ['Quality', d.quality_score],
      ['Popularity', d.popularity_score],
      ['Activity', d.activity_score],
      ['Wallet', d.wallet_score],
      ['Freshness', d.freshness_score],
      ['Metadata', d.metadata_completeness_score],
    ]
    return {
      tags: Array.isArray(d.tags) ? (d.tags as string[]).slice(0, 8) : [],
      categories: Array.isArray(d.categories) ? (d.categories as string[]) : [],
      agentUrl: cleanUrl(d.agent_url),
      a2aEndpoint: a2a,
      mcpServer: cleanUrl(d.mcp_server),
      endpointVerified: !!d.is_endpoint_verified,
      endpointDomain: typeof d.endpoint_verified_domain === 'string' ? d.endpoint_verified_domain : undefined,
      scores: scoreDefs.map(([label, v]) => ({ label, value: typeof v === 'number' ? v : 0 })),
      totalScore: typeof d.total_score === 'number' ? d.total_score : 0,
      watchCount: typeof d.watch_count === 'number' ? d.watch_count : 0,
      validations: typeof d.total_validations === 'number' ? d.total_validations : 0,
      successfulValidations: typeof d.successful_validations === 'number' ? d.successful_validations : 0,
      publisherTier: typeof d.owner_publisher_tier === 'string' ? d.owner_publisher_tier : undefined,
      healthStatus: typeof d.health_status === 'string' ? d.health_status : undefined,
      agentWallet: typeof d.agent_wallet === 'string' ? d.agent_wallet : undefined,
      isTermix: !!a2a && /termix/i.test(a2a),
    }
  } catch {
    return null
  }
}

// Real per-agent feedback (reviews) from the 8004scan API.
export interface AgentReview {
  reviewer: string
  score: number | null // 0–100
  comment: string
  when: string
  tags: string[]
}

export async function fetchAgentReviews(tokenId: number, limit = 8): Promise<AgentReview[]> {
  try {
    const r = await fetch(
      `/8004/feedbacks?chain_id=56&agent_token_id=${tokenId}&limit=${limit}&sort_by=submitted_at&sort_order=desc`,
    )
    if (!r.ok) return []
    const j = (await r.json()) as { items?: Array<Record<string, unknown>> }
    if (!Array.isArray(j.items)) return []
    return j.items
      .filter((f) => !f.is_revoked)
      .map((f) => {
        const addr = String(f.user_address ?? '')
        const at = f.submitted_at ? new Date(String(f.submitted_at)) : null
        const tags = [f.tag1, f.tag2].filter((t): t is string => typeof t === 'string' && !!t)
        return {
          reviewer: addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : 'anon',
          score: typeof f.score === 'number' ? f.score : null,
          comment: typeof f.comment === 'string' ? f.comment : '',
          when: at ? relTime(at) : '',
          tags,
        }
      })
      .filter((r) => r.comment || r.score != null)
  } catch {
    return []
  }
}

function relTime(d: Date): string {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

// The 8004scan Free tier is flaky — transient 500s (DATABASE_ERROR) and
// the occasional empty items[]. Retry a couple of times with a short
// backoff before giving up so one bad response doesn't blank the UI.
async function getJson(url: string, tries = 3): Promise<{ items?: ScanItem[] } | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) {
        const j = (await r.json()) as { success?: boolean; items?: ScanItem[] }
        if (j && j.success !== false && Array.isArray(j.items)) return j
      }
    } catch {
      /* retry */
    }
    if (i < tries - 1) await new Promise((res) => setTimeout(res, 350 * (i + 1)))
  }
  return null
}

// Filter an already-loaded live list down to one category — the fallback
// when 8004scan's semantic search is unavailable. Every agent already
// carries its classified category, so this is an honest keyword match, not
// a fabricated grouping.
export function filterAgentsByCategory(list: OnchainAgent[], cat: Exclude<LiveCategory, 'other'>): OnchainAgent[] {
  const direct = list.filter((a) => a.category === cat)
  if (direct.length >= 4) return direct
  const re = RULES.find((r) => r.cat === cat)?.re
  if (!re) return direct
  const seen = new Set(direct.map((a) => a.id))
  const extra = list.filter((a) => !seen.has(a.id) && re.test(`${a.name} ${a.description}`))
  return [...direct, ...extra]
}

// Sort a live list by one of the real on-chain dimensions we actually have.
export type LiveSort = 'reputation' | 'reviews' | 'verified'
export function sortLiveAgents(list: OnchainAgent[], sort: LiveSort): OnchainAgent[] {
  const rep = (a: OnchainAgent) => a.trustScore + (a.feedbacks ? 0.5 : 0)
  return [...list].sort((a, b) => {
    if (sort === 'reviews') return (b.feedbacks ?? 0) - (a.feedbacks ?? 0) || rep(b) - rep(a)
    if (sort === 'verified') return Number(!!b.verified) - Number(!!a.verified) || rep(b) - rep(a)
    return rep(b) - rep(a) || (b.feedbacks ?? 0) - (a.feedbacks ?? 0)
  })
}

// Per-category real agents via 8004scan semantic search — this is what
// makes the four marketplace categories genuinely deep with relevant BSC
// agents instead of keyword-matched leftovers.
const CATEGORY_QUERY: Record<Exclude<LiveCategory, 'other'>, string> = {
  rebalancing: 'liquidity rebalancing concentrated LP position range management pancakeswap',
  grid: 'grid trading market making automated orders strategy bot',
  yield: 'yield farming staking APR APY optimization vault lending deposit',
  health: 'liquidation protection health factor lending loan collateral monitor guardian',
}

// Last-good results per category, so a transient empty/500 from the API
// doesn't wipe a tab that was populated a moment ago.
const catCache: Partial<Record<Exclude<LiveCategory, 'other'>, OnchainAgent[]>> = {}

export async function fetchScanAgentsByCategory(cat: Exclude<LiveCategory, 'other'>, want = 24): Promise<OnchainAgent[]> {
  const q = encodeURIComponent(CATEGORY_QUERY[cat])
  const j = await getJson(`/8004/agents/search/semantic?q=${q}&chain_id=56&limit=40`)
  if (!j) return catCache[cat] ?? []
  const mapped = j.items!
    .map(scanToAgent)
    .filter((a): a is OnchainAgent => !!a)
    .map((a) => ({ ...a, category: cat })) // trust the semantic match for the tab
  const seen = new Set<string>()
  const unique = mapped
    .filter((a) => (seen.has(a.name.toLowerCase()) ? false : (seen.add(a.name.toLowerCase()), true)))
    .slice(0, want)
  if (unique.length) catCache[cat] = unique
  return unique.length ? unique : (catCache[cat] ?? [])
}

export async function fetchScanAgents(offset = 0, limit = 60, want = 24): Promise<OnchainAgent[]> {
  // sort_by=total_score floats the highest-scored (best) BSC agents up;
  // is_registered=true drops placeholders/defective entries. Retried, so a
  // transient DATABASE_ERROR doesn't immediately kick us to the fallback.
  const j = await getJson(
    `/8004/agents?chain_id=56&is_registered=true&sort_by=total_score&sort_order=desc&limit=${limit}&offset=${offset}`,
  )
  if (!j) throw new Error('8004scan unavailable')

  const mapped = j.items!.map(scanToAgent).filter((a): a is OnchainAgent => !!a)
  // dedupe by name — the registry has many same-named clones. The API already
  // returns them ordered by total_score (best first), so we keep that order.
  const seen = new Set<string>()
  const unique = mapped.filter((a) => {
    const k = a.name.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return unique.slice(0, want)
}

export function useOnchainAgents(want = 24) {
  const [agents, setAgents] = useState<OnchainAgent[]>([])
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading')
  const [srcMode, setSrcMode] = useState<'scan' | 'chain'>('scan')
  const [cursor, setCursor] = useState(0) // offset (scan) or fromId (chain)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let alive = true
    // Prefer the 8004scan API (real reputation); fall back to reading the
    // registry contract directly if the proxy/API is unavailable.
    fetchScanAgents(0, 60, want)
      .then((a) => {
        if (!alive) return
        if (a.length) {
          setAgents(a)
          setStatus('live')
          setSrcMode('scan')
          setCursor(60)
          return
        }
        throw new Error('empty')
      })
      .catch(async () => {
        try {
          const a = await fetchOnchainAgents(0, 80, want)
          if (!alive) return
          if (a.length) {
            setAgents(a)
            setStatus('live')
            setSrcMode('chain')
            setCursor(80)
          } else setStatus('error')
        } catch {
          if (alive) setStatus('error')
        }
      })
    return () => {
      alive = false
    }
  }, [want])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const more = srcMode === 'scan' ? await fetchScanAgents(cursor, 60, 24) : await fetchOnchainAgents(cursor, 80, 24)
      setAgents((prev) => {
        const seenIds = new Set(prev.map((a) => `${a.source ?? 'chain'}-${a.id}`))
        const seenNames = new Set(prev.map((a) => a.name.toLowerCase()))
        return [...prev, ...more.filter((a) => !seenIds.has(`${a.source ?? 'chain'}-${a.id}`) && !seenNames.has(a.name.toLowerCase()))]
      })
      setCursor((c) => c + (srcMode === 'scan' ? 60 : 80))
    } finally {
      setLoadingMore(false)
    }
  }, [srcMode, cursor])

  return { agents, status, loadMore, loadingMore, source: srcMode }
}
