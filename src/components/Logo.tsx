// The Proxima mark — a bold "p" hook with the signature dot, drawn in the
// brand amber. Uses currentColor so it inherits and can glow; a soft amber
// drop-shadow lets it sit on the dark kinetic-grid background without a tile.

export function ProximaMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      style={{ color: 'var(--color-accent)', filter: 'drop-shadow(0 0 7px color-mix(in srgb, var(--color-accent) 35%, transparent))' }}
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth={15} strokeLinecap="round" fill="none">
        <path d="M47 67 C 31 61 27 41 41 29 C 57 17 85 21 91 43 C 95 61 79 73 63 67" />
        <path d="M45 64 L 36 99" />
      </g>
      <circle cx="59" cy="47" r="9" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href="#top"
      onClick={onClick}
      className="pressable group flex items-center gap-2.5 rounded-lg"
      aria-label="Proxima home"
    >
      <ProximaMark size={30} className="shrink-0 transition-transform duration-200 group-hover:scale-[1.04]" />
      <span
        className="font-display text-[19px] font-700 lowercase tracking-[-0.01em]"
        style={{ color: 'var(--color-fg)' }}
      >
        proxima
      </span>
    </a>
  )
}
