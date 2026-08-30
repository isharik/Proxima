import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The 8004scan API blocks cross-origin browser calls, so the frontend
// talks to it through this same-origin dev proxy. The API key (if any)
// is read from a NON-VITE env var, so it stays server-side and never
// ships in the browser bundle. In production the same job is done by
// the serverless function at /api/scan.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const key = env.SCAN_KEY || ''
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5178,
      host: true,
      proxy: {
        '/8004': {
          target: 'https://api.8004scan.io/api/v1',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/8004/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (key) proxyReq.setHeader('X-API-Key', key)
            })
          },
        },
      },
    },
  }
})
