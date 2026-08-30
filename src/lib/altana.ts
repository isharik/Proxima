// ------------------------------------------------------------------
//  Real Altana on-chain sessions (BSC testnet, chain 97).
//
//  Authorization is a PASSKEY (WebAuthn) — the private key lives in the
//  device secure enclave and is never seen by this app or by anyone.
//  Gas is sponsored by the Altana relayer. The heavy SDK (viem + porto
//  + ox) is dynamically imported so it only loads when a user opts into
//  on-chain mode, and never weighs down the main bundle.
//
//  What this unlocks: `grantSession` writes a scoped session key to the
//  Altana account contract on BSC testnet — a real transaction, visible
//  in the explorer — enforcing the spend cap and expiry on-chain, with
//  one-transaction revocation. That is the Altana track's win condition.
// ------------------------------------------------------------------

export interface OnChainGrant {
  transactionHash?: string
  publicKey: string
  walletAddress: string
  explorerUrl: string
}

export const ALTANA_EXPLORER = 'https://testnet.bscscan.com'
export const ALTANA_FAUCET = 'https://testnet.bnbchain.org/faucet-smart'

export function passkeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials
  )
}

// A single client per page — recreated lazily on first use.
async function getSdk() {
  return import('@altananetwork/sdk')
}

// Guard any step so a stalled passkey prompt or unreachable relayer
// surfaces an error instead of hanging the UI forever.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ])
}

/** Get (or create) the caller's passkey-backed Altana wallet on BSC testnet. */
async function getWallet() {
  const sdk = await getSdk()
  const client = sdk.createClient({ chains: [sdk.BNB_TESTNET] })
  try {
    // returning user — recover the existing passkey wallet
    const w = await withTimeout(client.recoverFromPasskey({}), 90_000, 'Passkey')
    return { client, wallet: w, signer: w.signer }
  } catch {
    // first time — create one (prompts the authenticator)
    const w = await withTimeout(client.createPasskeyWallet({ name: 'Proxima Agent Wallet' }), 90_000, 'Passkey')
    return { client, wallet: w, signer: w.signer }
  }
}

/**
 * Register a scoped session on-chain. `capUsd` becomes a native-token
 * daily spend cap (a testnet proxy for the tUSDC cap); `expiryUnix` is
 * enforced by the contract. Returns the real tx hash + session public key.
 */
export async function grantOnChain(opts: {
  agentName: string
  capUsd: number
  expiryUnix: number
}): Promise<OnChainGrant> {
  const { client, wallet, signer } = await getWallet()
  const res = await withTimeout(
    client.grantSession({
      wallet,
      signer,
      permissions: {
        // testnet proxy: a native daily cap. Real deployments scope
        // `calls` to the agent's contracts too.
        spend: [{ limit: BigInt(Math.max(1, Math.round(opts.capUsd))) * 10n ** 15n, period: 'day' }],
      },
      expiry: opts.expiryUnix,
    }),
    60_000,
    'Relayer',
  )
  return {
    transactionHash: res.transactionHash,
    publicKey: res.publicKey,
    walletAddress: res.walletAddress,
    explorerUrl: res.transactionHash
      ? `${ALTANA_EXPLORER}/tx/${res.transactionHash}`
      : `${ALTANA_EXPLORER}/address/${res.walletAddress}`,
  }
}

/** Revoke a previously granted on-chain session by its public key. */
export async function revokeOnChain(publicKey: string): Promise<void> {
  const { client, wallet, signer } = await getWallet()
  await client.revokeSession({ wallet, signer, session: publicKey as `0x${string}` })
}

/** Turn any SDK error into a short, human message. */
export function altanaError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/not allowed|NotAllowed|abort|cancel/i.test(msg)) return 'Passkey prompt was dismissed.'
  if (/insufficient|balance|funds/i.test(msg)) return 'Wallet needs testnet BNB — fund it and retry.'
  if (/relay|network|fetch|timeout/i.test(msg)) return 'Altana relayer unreachable — try again shortly.'
  return msg.length > 120 ? msg.slice(0, 117) + '…' : msg
}
