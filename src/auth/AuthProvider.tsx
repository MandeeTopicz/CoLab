import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import { getFirebaseAuth } from "../lib/firebase"

type AuthUser = {
  userId: string
  email: string
  displayName: string
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  isReady: boolean
}

type AuthContextValue = AuthState & {
  signup: (body: { email: string; password: string; displayName: string }) => Promise<void>
  login: (body: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isReady: false,
  })

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState({ token: null, user: null, isReady: true })
        return
      }
      const token = await fbUser.getIdToken()
      setState({
        token,
        user: {
          userId: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || fbUser.email || "User",
        },
        isReady: true,
      })
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      ...state,
      signup: async ({ email, password, displayName }) => {
        const auth = getFirebaseAuth()
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName })
        await cred.user.getIdToken(true)
      },
      login: async ({ email, password }) => {
        const auth = getFirebaseAuth()
        const cred = await signInWithEmailAndPassword(auth, email, password)
        await cred.user.getIdToken(true)
      },
      logout: async () => {
        const auth = getFirebaseAuth()
        await signOut(auth)
      },
    }
  }, [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

