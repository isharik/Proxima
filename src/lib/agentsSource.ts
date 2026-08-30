import { useEffect, useState } from 'react'
import { AGENTS, type Agent } from '../data/agents'

// ------------------------------------------------------------------
//  Agent source of truth.
//
//  Proxima is built to read live ERC-8004 identity + reputation from
//  the 8004scan Pro API (free for hackathon participants). That API
//  needs an approved key, so this module fetches live when a key is
//  present (VITE_8004SCAN_KEY) and otherwise serves labelled demo
//  data for the four reference categories. The `source` flag is
//  surfaced in the UI — we never pass demo data off as live.
//
//  The live branch is a real fetch against the documented shape; drop
//  in a key and it swaps without touching any component.
// ------------------------------------------------------------------

export type DataSource = 'live' | 'demo'

const KEY = import.meta.env.VITE_8004SCAN_KEY as string | undefined
const BASE = 'https://8004scan.io/api' // developer hub base; chain=56 is BSC

interface AgentsState {
  agents: Agent[]
  source: DataSource
  status: 'loading' | 'ready' | 'error'
  error?: string
}

async function fetchLiveAgents(): Promise<Agent[]> {
  // Shape mirrors the 8004scan agent record. Adjust field mapping to
  // the exact Pro schema when the key is provisioned.
  const r = await fetch(`${BASE}/agents?chain=56&limit=60`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`8004scan ${r.status}`)
  const json = await r.json()
  // Mapping intentionally defensive; real wiring happens once the
  // schema is confirmed against a live key.
  if (!Array.isArray(json?.agents)) throw new Error('unexpected shape')
  return json.agents as Agent[]
}

export function useAgents(): AgentsState {
  const [state, setState] = useState<AgentsState>({
    agents: [],
    source: KEY ? 'live' : 'demo',
    status: 'loading',
  })

  useEffect(() => {
    let alive = true
    async function load() {
      if (KEY) {
        try {
          const agents = await fetchLiveAgents()
          if (!alive) return
          setState({ agents, source: 'live', status: 'ready' })
          return
        } catch (e) {
          // fall through to demo data, but report the reason
          if (!alive) return
          setState({
            agents: AGENTS,
            source: 'demo',
            status: 'ready',
            error: e instanceof Error ? e.message : 'live fetch failed',
          })
          return
        }
      }
      // demo path — brief delay so loading/skeleton states are real
      await new Promise((res) => setTimeout(res, 480))
      if (!alive) return
      setState({ agents: AGENTS, source: 'demo', status: 'ready' })
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  return state
}
