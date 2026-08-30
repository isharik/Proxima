import { useEffect, useRef, useCallback } from 'react'

// ------------------------------------------------------------------
//  KineticGrid — a living, interactive grid. It breathes on its own
//  (a slow flowing wave so it's never dead), bends toward the pointer,
//  and ripples on click. Tuned to Proxima's identity (amber on
//  near-black), DPR-crisp. Under reduced-motion it stays alive but
//  gentler: softer ambient drift, cursor warp damped, no click ripples.
//  Sits fixed behind all content; listens on window so clicks still
//  reach the UI ("click anywhere").
// ------------------------------------------------------------------

interface Point {
  x: number
  y: number
}
interface Ripple {
  x: number
  y: number
  radius: number
  opacity: number
  born: number
}

const CELL_SIZE = 58
const INFLUENCE_RADIUS = 280
const MAX_WARP = 24
const DOT_SPACING = 30
const LERP_SPEED = 0.09

const LINE_BASE = { r: 154, g: 163, b: 178, a: 0.1 }
const NODE_BASE = { r: 154, g: 163, b: 178, a: 0.2 }
const LINE_ACTIVE = { r: 245, g: 179, b: 1, a: 0.95 }
const NODE_ACTIVE = { r: 255, g: 207, b: 77, a: 1 }
const GLOW = '245,179,1'
const RIPPLE = '255,207,77'
const BG = '#08090c'

const NODE_BASE_RADIUS = 1.5
const NODE_ACTIVE_RADIUS = 3

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function lerpColor(
  base: { r: number; g: number; b: number; a: number },
  active: { r: number; g: number; b: number; a: number },
  t: number,
) {
  const r = Math.round(lerpN(base.r, active.r, t))
  const g = Math.round(lerpN(base.g, active.g, t))
  const b = Math.round(lerpN(base.b, active.b, t))
  const a = lerpN(base.a, active.a, t)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

export default function KineticGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef<Point>({ x: -9999, y: -9999 })
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 })
  const ripplesRef = useRef<Ripple[]>([])
  const rafRef = useRef<number>(0)
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 })
  const reduceRef = useRef(false)

  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
      now: number,
      ambientAmp: number,
      warpScale: number,
    ): { pt: Point; proximity: number } => {
      const edgeMargin = 1.5
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1)
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1)
      const pinFactor = colPin * colPin * rowPin * rowPin

      // ── Ambient life: two crossed sine waves flowing across the grid.
      //    Pinned at the edges so the frame stays anchored. This is what
      //    keeps the grid breathing when the pointer is still.
      const t = now * 0.001
      const ax = Math.sin(t * 0.6 + col * 0.55 + row * 0.32) * ambientAmp
      const ay = Math.cos(t * 0.5 + row * 0.5 + col * 0.26) * ambientAmp
      let ox = ax * pinFactor
      let oy = ay * pinFactor

      const dx = gx - mouse.x
      const dy = gy - mouse.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor

      // Ripple displacement
      for (const r of ripples) {
        const rdx = gx - r.x
        const rdy = gy - r.y
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy)
        const waveWidth = 55
        const diff = rdist - r.radius
        if (Math.abs(diff) < waveWidth) {
          const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 16 * pinFactor
          const angle = Math.atan2(rdy, rdx)
          const sign = diff < 0 ? -1 : 1
          ox += Math.cos(angle) * strength * sign * -1
          oy += Math.sin(angle) * strength * sign * -1
        }
      }

      // Cursor warp with bell falloff
      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0 && warpScale > 0) {
        const tt = dist / INFLUENCE_RADIUS
        const eased = tt < 0.01 ? 0 : (1 - tt) * (1 - tt) * Math.min(1, dist / 60)
        const warpAmt = eased * MAX_WARP * pinFactor * warpScale
        const angle = Math.atan2(dy, dx)
        ox -= Math.cos(angle) * warpAmt
        oy -= Math.sin(angle) * warpAmt
      }

      return { pt: { x: gx + ox, y: gy + oy }, proximity }
    },
    [],
  )

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { w: W, h: H } = sizeRef.current
      const mouse = mouseRef.current
      const ripples = ripplesRef.current
      const reduced = reduceRef.current
      const ambientAmp = reduced ? 3.5 : 8
      const warpScale = reduced ? 0.4 : 1

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      // static dot texture with a faint travelling shimmer
      for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
        for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
          const tw = 0.04 + 0.03 * (0.5 + 0.5 * Math.sin(now * 0.0012 + x * 0.05 + y * 0.05))
          ctx.fillStyle = `rgba(154,163,178,${tw.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(x, y, 0.7, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const age = (now - r.born) / 1000
        r.radius = Math.max(0, age * 380)
        r.opacity = Math.max(0, 1 - age * 1.2)
        if (r.opacity <= 0) ripples.splice(i, 1)
      }

      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1
      const cellW = W / (cols - 1)
      const cellH = H / (rows - 1)

      const pts: Point[][] = []
      const prox: number[][] = []
      for (let row = 0; row < rows; row++) {
        pts[row] = []
        prox[row] = []
        for (let col = 0; col < cols; col++) {
          const { pt, proximity } = getWarpedPoint(
            col * cellW,
            row * cellH,
            col,
            row,
            mouse,
            ripples,
            cols,
            rows,
            now,
            ambientAmp,
            warpScale,
          )
          pts[row][col] = pt
          prox[row][col] = proximity
        }
      }

      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2
        const t = avg * avg * (3 - 2 * avg)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = lerpColor(LINE_BASE, LINE_ACTIVE, t)
        ctx.lineWidth = lerpN(0.7, 1.4, t)
        ctx.stroke()
      }

      ctx.lineCap = 'butt'
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1])
      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col])

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[row][col]
          const pr = prox[row][col]
          const t = pr * pr * (3 - 2 * pr)
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t)
          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7)
            const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR)
            grd.addColorStop(0, `rgba(${GLOW},${(t * 0.35).toFixed(3)})`)
            grd.addColorStop(1, `rgba(${GLOW},0)`)
            ctx.beginPath()
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2)
            ctx.fillStyle = grd
            ctx.fill()
          }
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fillStyle = lerpColor(NODE_BASE, NODE_ACTIVE, t)
          ctx.fill()
        }
      }

      for (const r of ripples) {
        const safeRadius = Math.max(0, r.radius)
        ctx.beginPath()
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${RIPPLE},${(r.opacity * 0.25).toFixed(3)})`
        ctx.lineWidth = 1.4
        ctx.stroke()
      }
    },
    [getWarpedPoint],
  )

  const animate = useCallback(
    (now: number) => {
      const m = mouseRef.current
      const t = targetMouseRef.current
      m.x = lerpN(m.x, t.x, LERP_SPEED)
      m.y = lerpN(m.y, t.y, LERP_SPEED)
      draw(now)
      rafRef.current = requestAnimationFrame(animate)
    },
    [draw],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    reduceRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h, dpr }
    }
    setSize()
    window.addEventListener('resize', setSize)

    // Keep motion-preference live — if a user toggles it, we adapt.
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onMq = (e: MediaQueryListEvent) => (reduceRef.current = e.matches)
    mq?.addEventListener?.('change', onMq)

    const onMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onClick = (e: MouseEvent) => {
      if (reduceRef.current) return // no ripple bursts under reduced-motion
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1, born: performance.now() })
      if (ripplesRef.current.length > 8) ripplesRef.current.shift()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)

    // The loop ALWAYS runs — ambient motion keeps the grid alive; the
    // amplitude (not the loop) is what reduced-motion damps.
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', setSize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
      mq?.removeEventListener?.('change', onMq)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 90% at 50% 0%, transparent 30%, rgba(8,9,12,0.5) 78%, rgba(8,9,12,0.78) 100%)',
        }}
      />
    </div>
  )
}
