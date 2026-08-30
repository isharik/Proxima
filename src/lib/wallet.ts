import { useCallback, useEffect, useState } from 'react'

// ------------------------------------------------------------------
//  Real wallet connection over EIP-1193 (MetaMask / any injected
//  provider). No library. Reads the real account + live BNB balance,
//  can switch the wallet to BSC, and signs plain authorization
//  messages (personal_sign — a signature, never a fund transfer).
//  Everything is user-approved in their own wallet.
// ------------------------------------------------------------------

export const BSC = {
  chainIdHex: '0x38', // 56
  chainId: 56,
  name: 'BNB Smart Chain',
  rpc: 'https://bsc-dataseed.binance.org/',
  explorer: 'https://bscscan.com',
  symbol: 'BNB',
}

export interface WalletState {
  address: string | null
  chainId: number | null
  balanceBnb: number | null
  connecting: boolean
  available: boolean // is an injected provider present
  error: string | null
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...a: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...a: unknown[]) => void) => void
}

// EIP-6963 multi-wallet discovery: several injected wallets can coexist,
// so we collect announced providers and prefer MetaMask, falling back to
// the legacy window.ethereum.
interface Eip6963Detail {
  info: { rdns: string; name: string }
  provider: Eip1193
}
const discovered = new Map<string, Eip6963Detail>()
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e: Event) => {
    const d = (e as CustomEvent<Eip6963Detail>).detail
    if (d?.info?.rdns) discovered.set(d.info.rdns, d)
  })
  // ask any installed wallets to announce themselves
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

export function discoveredWallets(): { rdns: string; name: string }[] {
  return [...discovered.values()].map((d) => d.info)
}

function provider(): Eip1193 | null {
  if (typeof window === 'undefined') return null
  if (discovered.size) {
    const mm = [...discovered.values()].find((d) => /metamask/i.test(d.info.rdns))
    return (mm ?? [...discovered.values()][0]).provider
  }
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null
}

export function shortAddr(a: string | null): string {
  if (!a) return ''
  return a.slice(0, 6) + '…' + a.slice(-4)
}

async function readBalance(addr: string): Promise<number | null> {
  const p = provider()
  try {
    const hex = (await p?.request({ method: 'eth_getBalance', params: [addr, 'latest'] })) as string
    return parseInt(hex, 16) / 1e18
  } catch {
    return null
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balanceBnb: null,
    connecting: false,
    available: !!provider(),
    error: null,
  })

  const refresh = useCallback(async (addr: string) => {
    const p = provider()
    const chainHex = (await p?.request({ method: 'eth_chainId' })) as string | undefined
    const bal = await readBalance(addr)
    setState((s) => ({
      ...s,
      address: addr,
      chainId: chainHex ? parseInt(chainHex, 16) : null,
      balanceBnb: bal,
    }))
  }, [])

  const connect = useCallback(async () => {
    const p = provider()
    if (!p) {
      setState((s) => ({ ...s, error: 'no-wallet', available: false }))
      window.open('https://metamask.io/download/', '_blank', 'noopener')
      return
    }
    setState((s) => ({ ...s, connecting: true, error: null }))
    try {
      const accounts = (await p.request({ method: 'eth_requestAccounts' })) as string[]
      if (accounts?.[0]) await refresh(accounts[0])
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'connect failed' }))
    } finally {
      setState((s) => ({ ...s, connecting: false }))
    }
  }, [refresh])

  const disconnect = useCallback(() => {
    setState((s) => ({ ...s, address: null, chainId: null, balanceBnb: null }))
  }, [])

  const switchToBsc = useCallback(async () => {
    const p = provider()
    if (!p) return
    try {
      await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BSC.chainIdHex }] })
    } catch (e: unknown) {
      // 4902 = chain not added
      if ((e as { code?: number })?.code === 4902) {
        await p.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BSC.chainIdHex,
              chainName: BSC.name,
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: [BSC.rpc],
              blockExplorerUrls: [BSC.explorer],
            },
          ],
        })
      }
    }
  }, [])

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const p = provider()
    const addr = state.address
    if (!p || !addr) return null
    try {
      const sig = (await p.request({ method: 'personal_sign', params: [message, addr] })) as string
      return sig
    } catch {
      return null
    }
  }, [state.address])

  // react to account / chain changes
  useEffect(() => {
    const p = provider()
    if (!p?.on) return
    const onAccounts = (...a: unknown[]) => {
      const accs = a[0] as string[]
      if (accs?.[0]) refresh(accs[0])
      else disconnect()
    }
    const onChain = () => {
      if (state.address) refresh(state.address)
    }
    p.on('accountsChanged', onAccounts)
    p.on('chainChanged', onChain)
    return () => {
      p.removeListener?.('accountsChanged', onAccounts)
      p.removeListener?.('chainChanged', onChain)
    }
  }, [refresh, disconnect, state.address])

  // eagerly reconnect if already authorized
  useEffect(() => {
    const p = provider()
    if (!p) return
    p.request({ method: 'eth_accounts' })
      .then((accs) => {
        const a = accs as string[]
        if (a?.[0]) refresh(a[0])
      })
      .catch(() => {})
  }, [refresh])

  const onBsc = state.chainId === BSC.chainId
  return { ...state, onBsc, connect, disconnect, switchToBsc, signMessage }
}
