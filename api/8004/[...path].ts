// Vercel serverless proxy for the 8004scan API.
//
// The 8004scan API blocks cross-origin browser calls, so in production
// the frontend hits /8004/<path> (same origin) and this function forwards
// to https://api.8004scan.io/api/v1/<path>. The API key is read from the
// server-only SCAN_KEY env var and injected here, so it never reaches the
// browser bundle. Mirrors the Vite dev proxy in vite.config.ts.
//
// Vercel routes /8004/* here via the rewrite in vercel.json.

export const config = { runtime: 'edge' }

const UPSTREAM = 'https://api.8004scan.io/api/v1'

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/(api\/)?8004/, '')
  const target = `${UPSTREAM}${path}${url.search}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  const key = process.env.SCAN_KEY
  if (key) headers['X-API-Key'] = key

  try {
    const upstream = await fetch(target, { headers })
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'public, max-age=30',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'upstream unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}
