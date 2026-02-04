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
        <div style={{ padding: 18, maxWidth: 860, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
          <p style={{ opacity: 0.85 }}>
            The board UI crashed. Check the browser console for details.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              overflow: "auto",
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

