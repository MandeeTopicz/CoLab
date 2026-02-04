import { Component } from "react"

type Props = {
  children: React.ReactNode
  fallback?: (error: Error) => React.ReactNode
}

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Keep a signal in console for debugging production-only crashes
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error)
      return (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
            <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-secondary">
              The board UI crashed. Check the browser console for details.
            </p>
            <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-toolbar p-3 text-xs text-text-secondary">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

