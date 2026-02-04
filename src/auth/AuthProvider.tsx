import { createContext, useCallback, useContext, useMemo, useState } from "react"

type AuthUser = {
  userId: string
  email: string
  displayName: string
}

type AuthState = {
  token: string | null
  user: AuthUser | null
}

type AuthContextValue = AuthState & {
  setSession: (next: { token: string; user: AuthUser }) => void
  logout: () => void
}

const STORAGE_KEY = "auth.session.v1"

function loadInitial(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw) as AuthState
    if (typeof parsed?.token !== "string") return { token: null, user: null }
    if (!parsed?.user) return { token: null, user: null }
    return parsed
  } catch {
    return { token: null, user: null }
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadInitial())

  const setSession = useCallback((next: { token: string; user: AuthUser }) => {
    const newState: AuthState = { token: next.token, user: next.user }
    setState(newState)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
  }, [])

  const logout = useCallback(() => {
    setState({ token: null, user: null })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      user: state.user,
      setSession,
      logout,
    }),
    [state.token, state.user, setSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

