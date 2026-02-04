import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "./AuthProvider"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) return null

  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return children
}

