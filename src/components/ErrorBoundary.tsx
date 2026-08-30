import { Component, type ReactNode } from 'react'

// Keeps a single component failure from white-screening the whole app.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Proxima caught:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[100dvh] place-items-center px-6 text-center" style={{ background: 'var(--color-bg)' }}>
          <div>
            <h1 className="font-display text-[20px] font-700" style={{ color: 'var(--color-fg)' }}>
              Something went sideways.
            </h1>
            <p className="mt-2 text-[13.5px]" style={{ color: 'var(--color-muted)' }}>
              Reload to get back to the marketplace.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="pressable mt-5 rounded-xl px-5 py-2.5 font-display text-[13px] font-600"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
