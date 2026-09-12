import { useSyncExternalStore } from 'react'

// ------------------------------------------------------------------
//  A soft, Apple-style click. Synthesized with the Web Audio API — no
//  asset to load — so it's a tiny sine tick with a fast decay, kept
//  quiet enough to feel like tactile feedback rather than a noise. The
//  AudioContext is created lazily inside a real user gesture (browsers
//  require that), and the whole thing can be muted, persisted locally.
// ------------------------------------------------------------------

const KEY = 'proxima:sound'
let ctx: AudioContext | null = null
let muted = read()
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'off'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(v: boolean) {
  muted = v
  try {
    localStorage.setItem(KEY, v ? 'off' : 'on')
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l())
  if (!v) playClick() // little confirmation when you turn it back on
}

export function toggleMuted() {
  setMuted(!muted)
}

// React binding for the mute toggle in the nav.
export function useMuted() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => muted,
    () => false,
  )
}

// Two quick voices layered — a low body and a bright tick — give the
// click a rounded, physical feel instead of a flat beep.
export function playClick(strength = 1) {
  if (muted) return
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ||= new AC()
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.5 * strength
    master.connect(ctx.destination)

    const body = ctx.createOscillator()
    const bg = ctx.createGain()
    body.type = 'sine'
    body.frequency.setValueAtTime(300, t)
    body.frequency.exponentialRampToValueAtTime(150, t + 0.03)
    bg.gain.setValueAtTime(0.0001, t)
    bg.gain.exponentialRampToValueAtTime(0.09, t + 0.004)
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    body.connect(bg).connect(master)
    body.start(t)
    body.stop(t + 0.08)

    const tick = ctx.createOscillator()
    const tg = ctx.createGain()
    tick.type = 'triangle'
    tick.frequency.setValueAtTime(1400, t)
    tg.gain.setValueAtTime(0.0001, t)
    tg.gain.exponentialRampToValueAtTime(0.03, t + 0.002)
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
    tick.connect(tg).connect(master)
    tick.start(t)
    tick.stop(t + 0.04)
  } catch {
    /* audio unavailable */
  }
}

// Wire once: play on pointerdown of any interactive control. Returns a
// cleanup fn. Scoped to real controls so text selection stays silent.
export function installClickSound(): () => void {
  const onDown = (e: PointerEvent) => {
    const el = (e.target as HTMLElement | null)?.closest('button,a,[role="button"],.pressable,input[type="checkbox"],label')
    if (el && !(el as HTMLButtonElement).disabled) playClick()
  }
  window.addEventListener('pointerdown', onDown, { passive: true })
  return () => window.removeEventListener('pointerdown', onDown)
}
