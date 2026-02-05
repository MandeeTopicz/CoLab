import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isBoardRoute = location.pathname.startsWith("/app/boards/")

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 border-b border-border/80 bg-surface/90 backdrop-blur"
        data-board={isBoardRoute ? "true" : "false"}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2.5 rounded-lg px-2 py-1 text-xl font-bold tracking-tight text-text-primary hover:bg-toolbar transition-colors duration-fast"
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
              CoLab
            </button>
            <button
              className="hidden rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary shadow-xs hover:bg-toolbar transition-colors duration-fast md:inline-flex"
              type="button"
              onClick={() => navigate("/app/dashboard")}
            >
              Dashboard
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
            <button
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm hover:bg-primary-hover active:bg-primary-active transition-colors duration-fast"
              type="button"
            >
              Create board
            </button>

            <NavLink
              to="/app/notifications"
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-fast",
                  isActive ? "bg-toolbar text-text-primary" : "text-text-secondary hover:bg-toolbar",
                ].join(" ")
              }
            >
              Notifications
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

      {isBoardRoute ? (
        <main className="relative h-[calc(100vh-57px)]">
          <Outlet />
        </main>
      ) : (
        <div className="mx-auto grid min-h-[calc(100vh-57px)] max-w-7xl grid-cols-1 md:grid-cols-[240px_1fr]">
          <aside className="border-b border-border/80 bg-surface px-4 py-4 md:border-b-0 md:border-r">
            <nav className="flex gap-2 md:flex-col" aria-label="App navigation">
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

          <main className="px-4 py-6">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  )
}

