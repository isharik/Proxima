// The Proxima mark — a bold "p" hook with the signature dot, drawn in the
// brand amber. Uses currentColor so it inherits and can glow; a soft amber
// drop-shadow lets it sit on the dark kinetic-grid background without a tile.

export function ProximaMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  // A crisp lowercase "p": a straight stem and a clean bowl, with the
  // signature dot as the bowl's counter. Drawn on a whole-pixel grid so it
  // stays sharp at nav size; a tight glow (not a soft blur) keeps it lit on
  // the dark background without going fuzzy.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      style={{ color: 'var(--color-accent)', filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--color-accent) 40%, transparent))' }}
      aria-hidden
    >
      {/* stem */}
      <rect x="30" y="28" width="15" height="76" rx="7.5" fill="currentColor" />
      {/* bowl */}
      <circle cx="66" cy="54" r="25.5" fill="none" stroke="currentColor" strokeWidth="15" />
      {/* signature dot */}
      <circle cx="66" cy="54" r="7" fill="currentColor" />
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
