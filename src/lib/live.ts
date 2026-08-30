import { useEffect, useRef, useState } from 'react'

// ------------------------------------------------------------------
//  Genuinely live data — no API key required.
//   • BNB spot + 24h change   → Binance public REST
//   • BSC block height + gas  → BNB Chain public RPC
//  Polls on an interval, exposes loading / error, and degrades
//  gracefully (last-known value is kept on a transient failure).
// ------------------------------------------------------------------

export interface LiveNetwork {
  bnbPrice: number | null
  bnbChange24h: number | null
  block: number | null
  gasGwei: number | null
  updatedAt: number | null
  status: 'loading' | 'live' | 'error'
}

const BINANCE = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BNBUSDT'
const RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
]

async function rpc(method: string): Promise<string> {
  let lastErr: unknown
  for (const url of RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params: [], id: 1 }),
      })
      const j = await r.json()
      if (j?.result) return j.result as string
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('all RPCs failed')
}

export async function fetchNetwork(): Promise<Partial<LiveNetwork>> {
  const [ticker, block, gas] = await Promise.allSettled([
    fetch(BINANCE).then((r) => r.json()),
    rpc('eth_blockNumber'),
    rpc('eth_gasPrice'),
  ])

  const out: Partial<LiveNetwork> = { updatedAt: Date.now() }
  if (ticker.status === 'fulfilled' && ticker.value?.lastPrice) {
    out.bnbPrice = Number(ticker.value.lastPrice)
    out.bnbChange24h = Number(ticker.value.priceChangePercent)
  }
  if (block.status === 'fulfilled') out.block = parseInt(block.value, 16)
  if (gas.status === 'fulfilled') out.gasGwei = parseInt(gas.value, 16) / 1e9

  const anyOk = out.bnbPrice != null || out.block != null || out.gasGwei != null
  if (!anyOk) throw new Error('no live data')
  return out
}

export function useLiveNetwork(intervalMs = 15000): LiveNetwork {
  const [net, setNet] = useState<LiveNetwork>({
    bnbPrice: null,
    bnbChange24h: null,
    block: null,
    gasGwei: null,
    updatedAt: null,
    status: 'loading',
  })
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const data = await fetchNetwork()
        if (!alive) return
        setNet((prev) => ({ ...prev, ...data, status: 'live' }))
      } catch {
        if (!alive) return
        // keep last-known values; only flip status if we never had data
        setNet((prev) => ({ ...prev, status: prev.updatedAt ? 'live' : 'error' }))
      }
    }
    tick()
    timer.current = window.setInterval(tick, intervalMs)
    return () => {
      alive = false
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [intervalMs])

  return net
}

// smooth count-up for a number reaching a live target. The FIRST real
// value snaps in place (no roll-up from zero); later updates animate.
export function useCountUp(target: number | null, ms = 700): number {
  const [val, setVal] = useState(0)
  const initedRef = useRef(false)
  const valRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (target == null) return
    if (!initedRef.current) {
      initedRef.current = true
      valRef.current = target
      setVal(target)
      return
    }
    const from = valRef.current
    const delta = target - from
    if (delta === 0) return
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + delta * eased
      valRef.current = next
      setVal(next)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, ms])

  return val
}
