import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../auth/AuthProvider"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const next = useMemo(() => search.get("next") || "/app", [search])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-md">
        <h1 className="text-xl font-semibold text-text-primary">Log in</h1>
        <p className="mt-2 text-sm text-text-secondary">
          New here?{" "}
          <Link className="font-semibold text-link hover:text-link-hover active:text-link-active" to="/signup">
            Create an account
          </Link>
        </p>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setLoading(true)
            try {
              await login({ email, password })
              navigate(next, { replace: true })
            } catch (err: any) {
              setError(err?.message || "Login failed")
            } finally {
              setLoading(false)
            }
          }}
          className="mt-6 space-y-4"
        >
          <label className="block">
            <div className="text-sm font-semibold text-text-primary">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-text-primary">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 transition-colors duration-fast"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  )
}

