import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"
import { getFirebaseAuth } from "../lib/firebase"

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (typeof code !== "string") return (err as Error)?.message || "Authentication failed"
  switch (code) {
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method."
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "Invalid Firebase configuration. Check your API key and project settings."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in instead."
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password."
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later."
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again."
    default:
      return (err as Error)?.message || "Authentication failed"
  }
}

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
        const trimmedEmail = email.trim()
        const trimmedName = (displayName || "").trim()
        if (!trimmedEmail || !password) throw new Error("Email and password are required.")
        if (password.length < 6) throw new Error("Password must be at least 6 characters.")
        try {
          const auth = getFirebaseAuth()
          const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
          if (trimmedName) await updateProfile(cred.user, { displayName: trimmedName })
          await cred.user.getIdToken(true)
        } catch (err) {
          throw new Error(getAuthErrorMessage(err))
        }
      },
      login: async ({ email, password }) => {
        const trimmedEmail = email.trim()
        if (!trimmedEmail || !password) throw new Error("Email and password are required.")
        try {
          const auth = getFirebaseAuth()
          const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password)
          await cred.user.getIdToken(true)
        } catch (err) {
          throw new Error(getAuthErrorMessage(err))
        }
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

