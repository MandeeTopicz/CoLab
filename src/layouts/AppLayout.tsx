import { useEffect, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import { useApi } from "../lib/api"

export function AppLayout() {
  const { user, logout } = useAuth()
  const api = useApi()
  const navigate = useNavigate()
  const location = useLocation()

  const isBoardRoute = location.pathname.startsWith("/app/boards/")
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.listNotifications({ limit: 50 })
        if (!alive) return
        const unread = (res.notifications || []).filter((n: any) => !n?.readAt).length
        setUnreadCount(unread)
      } catch {
        if (!alive) return
        setUnreadCount(0)
      }
    })()
    return () => {
      alive = false
    }
  }, [location.pathname, user?.userId])

  return (
    <div className="min-h-screen">
      {!isBoardRoute && (
        <header className="sticky top-0 z-10 w-full border-b border-border/80 bg-surface/90 backdrop-blur">
          <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center gap-2.5 rounded-lg px-2 py-1 text-xl font-bold tracking-tight text-text-primary hover:bg-toolbar transition-colors duration-fast font-sans"
                type="button"
                onClick={() => navigate("/app/dashboard")}
              >
                <img
                  src="/logo.png"
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7"
                  width={28}
                  height={28}
                />
                colab
              </button>
            </div>

            <div className="hidden flex-1 px-3 md:block">
              <input
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search boards..."
                aria-label="Search boards"
              />
            </div>

            <div className="flex items-center gap-2">
              <NavLink
                to="/app/notifications"
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-fast",
                    isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                  ].join(" ")
                }
              >
                <span className="inline-flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full btn-gradient px-1.5 py-0.5 text-[11px] font-bold">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink
                to="/app/account"
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-fast",
                    isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                  ].join(" ")
                }
              >
                Account
              </NavLink>

              <span className="hidden text-sm text-text-secondary md:inline">
                {user?.displayName || "User"}
              </span>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-toolbar transition-colors duration-fast"
                onClick={() => {
                  logout()
                  navigate("/")
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </header>
      )}

      {isBoardRoute ? (
        <main className="relative h-screen">
          <Outlet />
        </main>
      ) : (
        <div className="grid min-h-[calc(100vh-57px)] w-full grid-cols-1 md:grid-cols-[240px_1fr]">
          <aside className="border-b border-border/80 bg-surface px-4 py-4 md:min-w-[240px] md:border-b-0 md:border-r">
            <nav className="flex gap-2 md:flex-col" aria-label="App navigation">
              <button
                type="button"
                onClick={() => navigate("/app/create-board")}
                className="w-full rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
              >
                Create board
              </button>
              <NavLink
                to="/app/dashboard"
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-fast",
                    isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                  ].join(" ")
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/app/workspace-settings"
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-fast",
                    isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                  ].join(" ")
                }
              >
                Workspace settings
              </NavLink>
            </nav>
          </aside>

          <main className="min-w-0 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  )
}

