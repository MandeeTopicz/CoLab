import { useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { AuthProvider } from "../auth/AuthProvider"
import { initFirebaseAnalytics } from "../lib/firebase"
import { ErrorBoundary } from "../components/ErrorBoundary"

export function AppRoot() {
  useEffect(() => {
    // Optional: enables analytics if configured via env vars
    initFirebaseAnalytics()
  }, [])

  return (
    <AuthProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AuthProvider>
  )
}

