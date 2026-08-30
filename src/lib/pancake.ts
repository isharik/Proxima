import { useEffect, useState } from 'react'

// ------------------------------------------------------------------
//  Live PancakeSwap v3 pool data, read straight from the pool contract
//  on BNB Chain via the public RPC — no API key, genuinely on-chain.
//  This is the concrete PancakeSwap benefit: agents that manage LPs or
//  grid-trade on Pancake operate on THESE pools, and the marketplace
//  shows their real price, liquidity and fee tier before you hire.
// ------------------------------------------------------------------

const RPCS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',
]

const FACTORY = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865' // PancakeSwap v3 factory
export const PANCAKE_INFO = 'https://pancakeswap.finance/info/v3'

export interface PoolData {
  label: string
  pool: string
  price: number // token1 priced in token0 terms, human-readable
  priceLabel: string
  liquidity: number // raw in-range liquidity (L)
  feeTier: number // e.g. 500 = 0.05%
  token0: string
  token1: string
  explorer: string
}

// Curated real pools agents commonly work. token0/token1 are sorted by
// address on-chain (lower address = token0).
const POOLS = [
  {
    label: 'WBNB / USDT',
    a: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    b: '0x55d398326f99059fF775485246999027B3197955', // USDT
    fee: 500,
    quote: 'USDT',
    base: 'WBNB',
  },
  {
    label: 'ETH / USDT',
    a: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
    b: '0x55d398326f99059fF775485246999027B3197955', // USDT
    fee: 500,
    quote: 'USDT',
    base: 'ETH',
  },
]

async function rpc(to: string, data: string): Promise<string | null> {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to, data }, 'latest'], id: 1 }),
      })
      const j = await r.json()
      if (j?.result) return j.result as string
    } catch {
      /* try next */
    }
  }
  return null
}

const pad = (a: string) => a.toLowerCase().replace('0x', '').padStart(64, '0')

function priceFromSqrt(sqrtHex: string, aIsToken0: boolean): number {
  // slot0 returns sqrtPriceX96 as the first 32-byte word
  const sqrt = BigInt('0x' + sqrtHex.slice(2, 66))
  const Q96sq = 2n ** 192n
  // token1 per token0, scaled by 1e18 to keep precision, both tokens 18-dec
  const scaled = (sqrt * sqrt * 10n ** 18n) / Q96sq
  const p10 = Number(scaled) / 1e18 // token1 per token0
  if (p10 === 0) return 0
  // aIsToken0 tells us whether our "base" token is token0. We want base
  // priced in the stable quote. If base is token0, quote(token1) per base = p10.
  return aIsToken0 ? p10 : 1 / p10
}

export async function fetchPool(def: (typeof POOLS)[number]): Promise<PoolData | null> {
  const aIsToken0 = def.a.toLowerCase() < def.b.toLowerCase()
  const t0 = aIsToken0 ? def.a : def.b
  const t1 = aIsToken0 ? def.b : def.a
  const getPool = '0x1698ee82' + pad(t0) + pad(t1) + def.fee.toString(16).padStart(64, '0')
  const poolRaw = await rpc(FACTORY, getPool)
  if (!poolRaw) return null
  const pool = '0x' + poolRaw.slice(-40)
  if (/^0x0+$/.test(pool)) return null

  const [slot0, liq] = await Promise.all([rpc(pool, '0x3850c7bd'), rpc(pool, '0x1a686502')])
  if (!slot0) return null

  const price = priceFromSqrt(slot0, aIsToken0)
  const liquidity = liq ? Number(BigInt(liq)) : 0

  return {
    label: def.label,
    pool,
    price,
    priceLabel: `${def.base} / ${def.quote}`,
    liquidity,
    feeTier: def.fee,
    token0: t0,
    token1: t1,
    explorer: `https://bscscan.com/address/${pool}`,
  }
}

export function usePancakePools(pollMs = 20000) {
  const [pools, setPools] = useState<PoolData[]>([])
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await Promise.all(POOLS.map(fetchPool))
        const ok = res.filter((p): p is PoolData => !!p)
        if (!alive) return
        if (ok.length) {
          setPools(ok)
          setStatus('live')
        } else setStatus((s) => (pools.length ? s : 'error'))
      } catch {
        if (alive) setStatus((s) => (pools.length ? s : 'error'))
      }
    }
    load()
    const t = window.setInterval(load, pollMs)
    return () => {
      alive = false
      window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs])

  return { pools, status }
}
