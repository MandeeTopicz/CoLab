import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../auth/AuthProvider"
import { useApi } from "../../lib/api"

export function SignupPage() {
  const api = useApi()
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <h1>Sign up</h1>
      <p style={{ opacity: 0.85 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setLoading(true)
          try {
            const res = await api.signup({ displayName, email, password })
            setSession({ token: res.token, user: res.user })
            navigate("/app", { replace: true })
          } catch (err: any) {
            setError(err?.message || "Signup failed")
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Display name</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          />
        </label>
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
            minLength={8}
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
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  )
}

