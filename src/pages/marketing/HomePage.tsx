import { Link } from "react-router-dom"

export function HomePage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 44, lineHeight: 1.05, marginBottom: 14 }}>
        Collaborative whiteboards for teams
      </h1>
      <p style={{ opacity: 0.85, fontSize: 18, marginBottom: 18 }}>
        Create boards, organize ideas, and collaborate in real time.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/signup" className="mk-cta">
          Sign up for free
        </Link>
        <Link to="/login" className="mk-link">
          Log in
        </Link>
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Interactive demo (placeholder)</div>
        <div style={{ opacity: 0.8 }}>
          This section will host the pre-login interactive demo board (pan/zoom + basic objects).
        </div>
      </div>
    </div>
  )
}

