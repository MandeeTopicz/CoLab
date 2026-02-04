import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../auth/AuthProvider"
import { useApi } from "../../lib/api"

export function LoginPage() {
  const api = useApi()
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const next = useMemo(() => search.get("next") || "/app", [search])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Log in</h1>
      <p style={{ opacity: 0.85 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setLoading(true)
          try {
            const res = await api.login({ email, password })
            setSession({ token: res.token, user: res.user })
            navigate(next, { replace: true })
          } catch (err: any) {
            setError(err?.message || "Login failed")
          } finally {
            setLoading(false)
          }
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 14,
        }}
      >
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          />
        </label>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          />
        </label>

        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.7)",
              background: "rgba(239,68,68,0.12)",
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ padding: 10, borderRadius: 10 }}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  )
}

