export default function AgentCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full" style={{ background: 'var(--color-surface-2)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
          <div className="h-2.5 w-20 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
        <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex gap-5">
          <div className="h-8 w-16 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
          <div className="h-8 w-16 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
        </div>
        <div className="h-9 w-24 animate-pulse rounded" style={{ background: 'var(--color-surface-2)' }} />
      </div>
      <div className="h-8 w-full animate-pulse rounded border-t" style={{ background: 'transparent', borderColor: 'var(--color-line)' }} />
    </div>
  )
}
